const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "GCSRM API",
            version: "1.0.0",
            description: "API documentation for GitHub Club SRM Server - handles team members and sponsors management.\n\n**Testing the API:** Use the 'Current server' option in the servers dropdown above to avoid CORS issues when testing endpoints. Cross-origin requests to external servers may be blocked by browser security policies.",
            contact: {
                name: "GitHub Club SRM",
                email: "contact@githubsrm.tech"
            },
            license: {
                name: "ISC",
                url: "https://opensource.org/licenses/ISC"
            }
        },
        servers: [
            {
                url: "/api/v1",
                description: "Current server (same origin - recommended for testing)"
            },
            {
                url: "http://localhost:3000/api/v1",
                description: "Local development server"
            },
            {
                url: "https://octacore.githubsrmist.in/api/v1",
                description: "Production server (may have CORS restrictions)"
            }
        ],
        components: {
            schemas: {
                Sponsor: {
                    type: "object",
                    required: ["name", "logo", "alt", "tier", "link"],
                    properties: {
                        _id: {
                            type: "string",
                            description: "Auto-generated MongoDB ObjectId",
                            example: "507f1f77bcf86cd799439011"
                        },
                        name: {
                            type: "string",
                            description: "Name of the sponsor organization",
                            example: "GitHub"
                        },
                        logo: {
                            type: "string",
                            description: "URL to the sponsor's logo image",
                            example: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
                        },
                        alt: {
                            type: "string",
                            description: "Alt text for the logo image",
                            example: "GitHub Logo"
                        },
                        tier: {
                            type: "string",
                            description: "Sponsorship tier level",
                            example: "Gold",
                            enum: ["Platinum", "Gold", "Silver", "Bronze"]
                        },
                        link: {
                            type: "string",
                            description: "URL to the sponsor's website",
                            example: "https://github.com"
                        }
                    }
                },
                SponsorInput: {
                    type: "object",
                    required: ["name", "logo", "alt", "tier", "link"],
                    properties: {
                        name: {
                            type: "string",
                            description: "Name of the sponsor organization",
                            example: "GitHub"
                        },
                        logo: {
                            type: "string",
                            description: "URL to the sponsor's logo image",
                            example: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
                        },
                        alt: {
                            type: "string",
                            description: "Alt text for the logo image",
                            example: "GitHub Logo"
                        },
                        tier: {
                            type: "string",
                            description: "Sponsorship tier level",
                            example: "Gold",
                            enum: ["Platinum", "Gold", "Silver", "Bronze"]
                        },
                        link: {
                            type: "string",
                            description: "URL to the sponsor's website",
                            example: "https://github.com"
                        }
                    }
                },
                Team: {
                    type: "object",
                    required: ["index", "name", "domain", "position", "pictureUrl"],
                    properties: {
                        _id: { type: "string", description: "MongoDB ObjectId", example: "507f1f77bcf86cd799439011" },
                        index: { type: "number", description: "Ordering index for display", example: 1 },
                        name: { type: "string", description: "Member's full name", example: "Jane Doe" },
                        domain: { type: "string", description: "Area/domain (e.g., Backend)", example: "Backend" },
                        position: { type: "string", description: "Role or position", example: "Lead" },
                        caption: { type: "string", description: "Short caption or tagline", example: "Open source enthusiast" },
                        joined: { type: "number", description: "Year joined", example: 2023 },
                        pictureUrl: { type: "string", description: "URL to profile picture", example: "https://example.com/avatar.jpg" },
                        isCurrent: { type: "boolean", description: "Whether member is currently active", example: true },
                        socials: {
                            type: "object",
                            properties: {
                                linkedin: { type: "string", example: "https://linkedin.com/in/janedoe" },
                                github: { type: "string", example: "https://github.com/janedoe" },
                                instagram: { type: "string", example: "https://instagram.com/janedoe" },
                                website: { type: "string", example: "https://janedoe.dev" }
                            }
                        },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" }
                    }
                },
                TeamInput: {
                    type: "object",
                    required: ["index", "name", "domain", "position", "pictureUrl"],
                    properties: {
                        index: { type: "number" },
                        name: { type: "string" },
                        domain: { type: "string" },
                        position: { type: "string" },
                        caption: { type: "string" },
                        joined: { type: "number" },
                        pictureUrl: { type: "string" },
                        isCurrent: { type: "boolean" },
                        socials: { type: "object" }
                    }
                },
                Error: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "Error message describing what went wrong",
                            example: "Sponsor not found"
                        },
                        timestamp: {
                            type: "string",
                            format: "date-time",
                            description: "Timestamp when the error occurred",
                            example: "2023-10-15T10:30:00Z"
                        }
                    }
                },
                SuccessMessage: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "Success message",
                            example: "Sponsor deleted successfully"
                        }
                    }
                }
            },
            parameters: {
                SponsorId: {
                    in: "path",
                    name: "id",
                    required: true,
                    schema: {
                        type: "string",
                        pattern: "^[0-9a-fA-F]{24}$"
                    },
                    description: "MongoDB ObjectId of the sponsor",
                    example: "507f1f77bcf86cd799439011"
                }
            },
            responses: {
                NotFound: {
                    description: "Sponsor not found",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            },
                            example: {
                                message: "Sponsor not found"
                            }
                        }
                    }
                },
                BadRequest: {
                    description: "Invalid request parameters",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            },
                            example: {
                                message: "Invalid sponsor ID format"
                            }
                        }
                    }
                },
                InternalServerError: {
                    description: "Internal server error",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            },
                            example: {
                                message: "Database connection failed"
                            }
                        }
                    }
                }
            }
        }
    },
    apis: ["./src/routes/*.js"]
};

const swaggerSpec = swaggerJsDoc(options);

const swaggerDocs = (app) => {
    // Enhanced Swagger UI options for better CORS handling
    const swaggerUiOptions = {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: "GCSRM API Documentation",
        swaggerOptions: {
            // Use the current server as default to avoid CORS issues
            servers: [
                {
                    url: "/api/v1",
                    description: "Current server (recommended)"
                }
            ],
            // Enable request interception to handle CORS
            requestInterceptor: function (request) {
                // Set credentials for same-origin requests
                if (request.url.startsWith('/') || request.url.includes(window.location.origin)) {
                    request.credentials = 'same-origin';
                }
                return request;
            },
            responseInterceptor: function (response) {
                // Handle CORS errors gracefully
                if (response.status === 0) {
                    response.text = 'CORS Error: Cross-origin request blocked. Use the "Current server" option above to test the API from the same origin.';
                }
                return response;
            }
        }
    };

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
    console.log("Swagger docs available at /api-docs");
};

module.exports = swaggerDocs;