const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "GCSRM API",
            version: "1.0.0",
            description: "API documentation for GitHub Club SRM Server - handles team members and sponsors management",
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
                url: "http://localhost:3000/api/v1",
                description: "Local development server"
            },
            {
                url: "https://octacore.githubsrmist.in/api/v1",
                description: "Production server"
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
    apis: [path.join(__dirname, "../routes/*.js")]
};

const swaggerSpec = swaggerJsDoc(options);

const swaggerDocs = (app) => {
    try {
        // Configuration for serverless environments (like Vercel)
        const swaggerOptions = {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: "GCSRM API Documentation",
            // Use CDN for assets to avoid static file serving issues on Vercel
            swaggerOptions: {
                url: null, // We'll provide the spec directly
            },
            // Configure to use CDN resources
            customfavIcon: "https://cdn.jsdelivr.net/npm/swagger-ui-dist/favicon-32x32.png",
            customCssUrl: [
                "https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui.css"
            ],
            customJs: [
                "https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-bundle.js",
                "https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-standalone-preset.js"
            ]
        };

        // Alternative setup for serverless environments
        if (process.env.NODE_ENV === 'production') {
            // For production, we'll serve a custom HTML page with CDN resources
            app.get('/api-docs', (req, res) => {
                const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>GCSRM API Documentation</title>
                    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
                    <style>
                        html {
                            box-sizing: border-box;
                            overflow: -moz-scrollbars-vertical;
                            overflow-y: scroll;
                        }
                        *, *:before, *:after {
                            box-sizing: inherit;
                        }
                        body {
                            margin:0;
                            background: #fafafa;
                        }
                        .swagger-ui .topbar { display: none }
                    </style>
                </head>
                <body>
                    <div id="swagger-ui"></div>
                    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
                    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
                    <script>
                        window.onload = function() {
                            const ui = SwaggerUIBundle({
                                url: '/api-docs/swagger.json',
                                dom_id: '#swagger-ui',
                                deepLinking: true,
                                presets: [
                                    SwaggerUIBundle.presets.apis,
                                    SwaggerUIStandalonePreset
                                ],
                                plugins: [
                                    SwaggerUIBundle.plugins.DownloadUrl
                                ],
                                layout: "StandaloneLayout"
                            });
                        };
                    </script>
                </body>
                </html>`;
                res.send(html);
            });

            // Serve the swagger spec as JSON
            app.get('/api-docs/swagger.json', (req, res) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(swaggerSpec);
            });
        } else {
            // For development, use the standard setup
            app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
        }

        // Log the swagger spec for debugging
        console.log("Swagger spec generated successfully");
        console.log(`Found ${Object.keys(swaggerSpec.paths || {}).length} API paths`);

        // Debug: Log available paths
        if (swaggerSpec.paths) {
            console.log("Available API endpoints:");
            Object.keys(swaggerSpec.paths).forEach(path => {
                const methods = Object.keys(swaggerSpec.paths[path]);
                console.log(`  ${path}: ${methods.join(', ')}`);
            });
        }

        const port = process.env.PORT || 3000;
        const host = process.env.NODE_ENV === 'production'
            ? 'https://octacore.githubsrmist.in'
            : `http://localhost:${port}`;

        console.log(`Swagger docs available at ${host}/api-docs`);
        console.log(`Swagger JSON spec available at ${host}/api-docs/swagger.json`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    } catch (error) {
        console.error("Error setting up Swagger documentation:", error);
        console.error("Stack trace:", error.stack);

        // Fallback: provide a simple error page
        app.get('/api-docs', (req, res) => {
            res.status(500).send(`
                <html>
                <head><title>API Documentation Error</title></head>
                <body>
                    <h1>API Documentation Unavailable</h1>
                    <p>There was an error setting up the Swagger documentation.</p>
                    <p>Error: ${error.message}</p>
                    <p>Please check the server logs for more details.</p>
                </body>
                </html>
            `);
        });
    }
};

module.exports = swaggerDocs;