const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "GCSRM API",
            version: "1.0.0",
            description: "API documentation for GitHub SRM Community Server - handles team members and sponsors management.\n\n**Testing the API:** Use the 'Current server' option in the servers dropdown above to avoid CORS issues when testing endpoints. Cross-origin requests to external servers may be blocked by browser security policies.",
            contact: {
                name: "GitHub SRM Community",
                email: "community@githubsrmist.in"
            },
            license: {
                name: "ISC",
                url: "https://opensource.org/licenses/ISC"
            }
        },
        servers: [
            {
                url: "/api",
                description: "Current server (same origin - recommended for testing)"
            },
            {
                url: "http://localhost:3000/api",
                description: "Local development server"
            },
            {
                url: "https://octacore.githubsrmist.in/api",
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
                Event: {
                    type: "object",
                    properties: {
                        _id: { type: "string", description: "MongoDB ObjectId", example: "507f1f77bcf86cd799439011" },
                        slug: { type: "string", example: "intro-to-node" },
                        event_name: { type: "string", example: "Intro to Node.js" },
                        event_description: { type: "string", example: "Beginner friendly session" },
                        speakers_details: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    talk_title: { type: "string" },
                                    image_url: { type: "string" }
                                }
                            }
                        },
                        event_date: { type: "string", format: "date-time" },
                        is_active: { type: "boolean" },
                        venue: { type: "string" },
                        sponsors_details: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    logo_url: { type: "string" },
                                    tier: { type: "string" }
                                }
                            }
                        },
                        duration: { type: "number" },
                        prerequisites: { type: "array", items: { type: "string" } },
                        cost: { type: "number" },
                        poster_url: { type: "string" },
                        registration_url: { type: "string" },
                        database: { type: "string" },
                        collection: {
                            type: "object",
                            properties: {
                                participants: { type: "string" },
                                organizers: { type: "string" },
                                volunteers: { type: "string" }
                            }
                        },
                        certificate: {
                            type: "object",
                            properties: {
                                organizers: { type: "string" },
                                participants: { type: "string" },
                                volunteers: { type: "string" }
                            }
                        },
                        jimp_config: {
                            type: "object",
                            properties: {
                                yOffset: { type: "string" },
                                color: { type: "string" },
                                font_size: { type: "string" }
                            }
                        },
                        teamEvent: { type: "boolean" },
                        teamSize: { type: "number" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" }
                    }
                },
                EventInput: {
                    type: "object",
                    required: ["slug", "event_name", "event_date", "venue", "collection", "jimp_config", "teamEvent"],
                    properties: {
                        slug: { type: "string" },
                        event_name: { type: "string" },
                        event_description: { type: "string" },
                        speakers_details: { type: "array", items: { type: "object" } },
                        event_date: { type: "string", format: "date-time" },
                        is_active: { type: "boolean" },
                        venue: { type: "string" },
                        sponsors_details: { type: "array", items: { type: "object" } },
                        duration: { type: "number" },
                        prerequisites: { type: "array", items: { type: "string" } },
                        cost: { type: "number" },
                        poster_url: { type: "string" },
                        registration_url: { type: "string" },
                        database: { type: "string" },
                        collection: { type: "object" },
                        certificate: { type: "object" },
                        jimp_config: { type: "object" },
                        teamEvent: { type: "boolean" },
                        teamSize: { type: "number" }
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
                ,
                ContactInput: {
                    type: "object",
                    required: ["name", "email", "message"],
                    properties: {
                        name: { type: "string", description: "Sender's full name", example: "Jane Developer" },
                        email: { type: "string", description: "Sender's email address", example: "jane@example.com" },
                        message: { type: "string", description: "Message body", example: "I'd like to know how to contribute." }
                    }
                },
                ContactResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string", example: "Thank you! Your message has been sent successfully. We'll get back to you within 24-48 hours." }
                    }
                },
                CertificateGenerateInput: {
                    type: "object",
                    required: ["email", "event", "type", "format"],
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            description: "Email address of the participant",
                            example: "john.doe@example.com"
                        },
                        event: {
                            type: "string",
                            description: "Event slug identifier",
                            example: "intro-to-node"
                        },
                        type: {
                            type: "string",
                            description: "Type of certificate (plural form for collection)",
                            enum: ["participants", "organizers", "volunteers", "speakers", "winners"],
                            example: "participants"
                        },
                        format: {
                            type: "string",
                            description: "Response format for the certificate",
                            enum: ["base64", "image", "pdf"],
                            default: "base64",
                            example: "base64"
                        }
                    }
                },
                CertificateBase64Response: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        certificateId: { type: "string", example: "INTRO-TO-NODE-2025-X7B9K2" },
                        participantName: { type: "string", example: "John Doe" },
                        eventSlug: { type: "string", example: "intro-to-node" },
                        certificateType: { type: "string", example: "participant" },
                        issueDate: { type: "string", format: "date-time", example: "2025-10-18T10:30:00.000Z" },
                        verified: { type: "boolean", example: true },
                        base64Image: {
                            type: "string",
                            description: "Base64-encoded PNG image with data URI prefix",
                            example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
                        },
                        downloadUrl: {
                            type: "string",
                            description: "URL to download the certificate",
                            example: "/api/certificate/download/INTRO-TO-NODE-2025-X7B9K2"
                        }
                    }
                },
                IssuedCertificate: {
                    type: "object",
                    properties: {
                        certificateId: {
                            type: "string",
                            description: "Unique certificate identifier",
                            example: "INTRO-TO-NODE-2025-X7B9K2"
                        },
                        participantName: {
                            type: "string",
                            description: "Name of the certificate recipient",
                            example: "John Doe"
                        },
                        participantEmail: {
                            type: "string",
                            format: "email",
                            description: "Email of the certificate recipient",
                            example: "john.doe@example.com"
                        },
                        eventSlug: {
                            type: "string",
                            description: "Event identifier",
                            example: "intro-to-node"
                        },
                        certificateType: {
                            type: "string",
                            enum: ["participant", "organizer", "volunteer", "speaker", "winner"],
                            description: "Type of certificate",
                            example: "participant"
                        },
                        issueDate: {
                            type: "string",
                            format: "date-time",
                            description: "Date when certificate was issued",
                            example: "2025-10-18T10:30:00.000Z"
                        },
                        digitalSignature: {
                            type: "string",
                            description: "HMAC-SHA256 signature for verification",
                            example: "a3c5f9e8b2d4..."
                        },
                        isRevoked: {
                            type: "boolean",
                            description: "Whether certificate has been revoked",
                            example: false
                        },
                        revokedAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                            description: "Date when certificate was revoked"
                        },
                        revokedReason: {
                            type: "string",
                            nullable: true,
                            description: "Reason for certificate revocation"
                        },
                        metadata: {
                            type: "object",
                            description: "Additional certificate metadata",
                            properties: {
                                eventName: { type: "string", example: "Intro to Node.js" },
                                generatedAt: { type: "string", format: "date-time" }
                            }
                        }
                    }
                },
                CertificateVerifyResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        verified: { type: "boolean", example: true },
                        status: {
                            type: "string",
                            enum: ["valid", "revoked", "tampered"],
                            example: "valid"
                        },
                        message: {
                            type: "string",
                            example: "Certificate is valid and verified"
                        },
                        certificate: {
                            type: "object",
                            properties: {
                                certificateId: { type: "string", example: "INTRO-TO-NODE-2025-X7B9K2" },
                                participantName: { type: "string", example: "John Doe" },
                                eventSlug: { type: "string", example: "intro-to-node" },
                                certificateType: { type: "string", example: "participant" },
                                issueDate: { type: "string", format: "date-time" },
                                eventName: { type: "string", example: "Intro to Node.js" }
                            }
                        },
                        security: {
                            type: "object",
                            properties: {
                                signatureVerified: { type: "boolean", example: true },
                                message: { type: "string", example: "Digital signature verified successfully" }
                            }
                        },
                        revokedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Present only if certificate is revoked"
                        },
                        revokedReason: {
                            type: "string",
                            description: "Present only if certificate is revoked"
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