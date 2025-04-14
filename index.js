const aws = require("@pulumi/aws");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parse/sync");

aws.config.region = "us-east-2";  

const rulesFile = fs.readFileSync(path.join(__dirname, "rules.csv"));
const rules = csv.parse(rulesFile, {
    columns: true,
    skip_empty_lines: true,
});

const api = new aws.apigateway.RestApi("example-redirect-api", {
    name: "example-redirect-api",
    description: "API for handling redirects",
    endpointConfiguration: {
        types: "REGIONAL"
    }
});

// Keep track of created resources
const resourceCache = new Map();

function createNestedResources(parentId, pathSegments) {
    let currentParentId = parentId;
    let currentResource;

    let currentPath = '';
    for (const segment of pathSegments) {
        if (!segment) continue;
        
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        
        // Check if we already created this resource
        if (resourceCache.has(currentPath)) {
            currentResource = resourceCache.get(currentPath);
            currentParentId = currentResource.id;
            continue;
        }

        currentResource = new aws.apigateway.Resource(`resource-${currentPath}`, {
            restApi: api.id,
            parentId: currentParentId,
            pathPart: segment,
        });
        
        resourceCache.set(currentPath, currentResource);
        currentParentId = currentResource.id;
    }

    return currentResource;
}

const integrationResponses = rules.map((rule) => {
    const pathSegments = rule.source_path.split("/").filter(Boolean);
    
    let resource;
    if (pathSegments.length === 0) {
        // If path is '/', use the root resource directly
        resource = { id: api.rootResourceId };
    } else {
        // Create nested resources for non-root paths
        resource = createNestedResources(api.rootResourceId, pathSegments);
    }

    const method = new aws.apigateway.Method(`method-${pathSegments.length === 0 ? 'root' : pathSegments.join("-")}`, {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: "ANY",
        authorization: "NONE",
    });

    const integration = new aws.apigateway.Integration(`integration-${pathSegments.length === 0 ? 'root' : pathSegments.join("-")}`, {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,
        type: "MOCK",
        requestTemplates: {
            "application/json": '{"statusCode": 301}',
        },
    });

    const methodResponse = new aws.apigateway.MethodResponse(`response-${pathSegments.length === 0 ? 'root' : pathSegments.join("-")}`, {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,
        statusCode: "301",
        responseParameters: {
            "method.response.header.Location": true,
        },
    });

    return new aws.apigateway.IntegrationResponse(
        `integration-response-${pathSegments.length === 0 ? 'root' : pathSegments.join("-")}`,
        {
            restApi: api.id,
            resourceId: resource.id,
            httpMethod: method.httpMethod,
            statusCode: methodResponse.statusCode,
            responseParameters: {
                "method.response.header.Location": `'${rule.destination_url}'`,
            },
        }
    );
});

const deployment = new aws.apigateway.Deployment("api-deployment", {
    restApi: api.id
}, {
    dependsOn: [api, ...integrationResponses]
});

const stage = new aws.apigateway.Stage("prod", {
    deployment: deployment.id,
    restApi: api.id,
    stageName: "prod",
});

const apiDeployment = new aws.apigateway.Deployment(`api-deployment-stage-${new Date().toISOString()}`, {
    restApi: api.id,
    stageName: stage.stageName,
    description: `API deployment to prod stage`,
}, {
    dependsOn: [stage],
});

const apiMapping = new aws.apigateway.BasePathMapping("example", {
    restApi: api.id,
    stageName: stage.stageName,
    domainName: "gateway.mydomain.com",
    basePath: "example-path"
});

