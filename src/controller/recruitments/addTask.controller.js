const mongoose = require("mongoose");
const { connectRecruitmentDB } = require("../../utils/db");
const getTaskModel = require("../../models/tasks.model");
const Sentry = require("@sentry/node");
const { validationResult } = require("express-validator");

/**
 * Normalize year values coming from frontend.
 *
 * Accepted:
 * 1
 * "1"
 * "1st"
 * "1st Year"
 * "first"
 *
 * 2
 * "2"
 * "2nd"
 * "2nd Year"
 * "second"
 *
 * both
 */
const normalizeYear = (year) => {
    if (year === undefined || year === null) {
        return null;
    }

    const value = String(year).toLowerCase().trim();

    if (
        value === "1" ||
        value === "1st" ||
        value === "1st year" ||
        value === "first" ||
        value === "first year"
    ) {
        return "1";
    }

    if (
        value === "2" ||
        value === "2nd" ||
        value === "2nd year" ||
        value === "second" ||
        value === "second year"
    ) {
        return "2";
    }

    if (value === "both") {
        return "both";
    }

    return null;
};

/**
 * Clean strings and remove accidental surrounding quotes.
 */
const cleanString = (value) => {
    if (value === undefined || value === null) {
        return value;
    }

    return String(value)
        .trim()
        .replace(/^\s*"+|"+\s*$/g, "");
};

/**
 * Clean arrays received from frontend.
 */
const cleanArray = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => cleanString(item))
        .filter((item) => item !== "");
};

/**
 * Add a new task to MongoDB
 */
const addTask = async (req, res, next) => {
    const startTime = Date.now();

    try {
        // ----------------------------------------
        // 1. Validate express-validator errors
        // ----------------------------------------
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            Sentry.captureMessage("Validation errors in addTask", {
                level: "warning",
                tags: {
                    operation: "addTask",
                    validation: "failed"
                },
                extra: {
                    errors: errors.array()
                }
            });

            return res.status(400).json({
                success: false,
                error: "Validation failed",
                errors: errors.array()
            });
        }

        // ----------------------------------------
        // 2. Extract body
        // ----------------------------------------
        const {
            title,
            goal,
            description,
            guidelines,
            link,
            domain,
            subdomain,
            taskType,
            year,
            deadline,
            steps,
            requirements,
            datasets,
            evaluation,
            outputs,
            techStack,
            tags,
            submissionForm,
            submissionInstructions
        } = req.body;

        // ----------------------------------------
        // 3. Validate required fields
        // ----------------------------------------
        const missingFields = [];

        if (!title?.trim()) missingFields.push("title");
        if (!goal?.trim()) missingFields.push("goal");
        if (!description?.trim()) missingFields.push("description");
        if (!guidelines?.trim()) missingFields.push("guidelines");
        if (!domain) missingFields.push("domain");
        if (!taskType?.trim()) missingFields.push("taskType");
        if (!year) missingFields.push("year");
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
                missingFields
            });
        }

        // ----------------------------------------
        // 4. Validate domain
        // ----------------------------------------
        const allowedDomains = [
            "Technical",
            "Creatives",
            "Corporate"
        ];

        if (!allowedDomains.includes(domain)) {
            return res.status(400).json({
                success: false,
                error: "Invalid domain",
                allowedDomains
            });
        }

        // ----------------------------------------
        // 5. Normalize year
        // ----------------------------------------
        const normalizedYear = normalizeYear(year);

        if (!normalizedYear) {
            return res.status(400).json({
                success: false,
                error: "Invalid year",
                message: "Year must be 1, 2, or both"
            });
        }

        // ----------------------------------------
        // 6. Validate deadline if provided
        // ----------------------------------------
        let normalizedDeadline = null;

        if (deadline) {
            const parsedDeadline = new Date(deadline);

            if (isNaN(parsedDeadline.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid deadline",
                    message: "deadline must be a valid date"
                });
            }

            normalizedDeadline = parsedDeadline;
        }

        // ----------------------------------------
        // 7. Connect to DB
        // ----------------------------------------
        const recruitmentConn = await connectRecruitmentDB();

        const Task = getTaskModel(recruitmentConn);

        // ----------------------------------------
        // 8. Prepare task
        // ----------------------------------------
        const taskData = {
            title: cleanString(title),
            goal: cleanString(goal),
            description: cleanString(description),
            guidelines: cleanString(guidelines),
            link: link ? cleanString(link) : null,

            domain: cleanString(domain),

            subdomain: subdomain
                ? cleanString(subdomain)
                : null,

            taskType: cleanString(taskType),

            year: normalizedYear,

            deadline: normalizedDeadline,

            steps: cleanArray(steps),
            requirements: cleanArray(requirements),
            datasets: cleanArray(datasets),

            evaluation: evaluation
                ? cleanString(evaluation)
                : null,

            outputs: cleanArray(outputs),
            techStack: cleanArray(techStack),
            tags: cleanArray(tags),

            submissionForm: submissionForm
                ? cleanString(submissionForm)
                : null,

            submissionInstructions:
                submissionInstructions
                    ? cleanString(submissionInstructions)
                    : null
        };

        // ----------------------------------------
        // 9. Insert task
        // ----------------------------------------
        const task = await Task.create(taskData);

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info("Task added successfully", {
            operation: "addTask",
            taskId: task._id.toString(),
            title: task.title,
            domain: task.domain,
            subdomain: task.subdomain,
            year: task.year,
            totalDuration: `${totalDuration}ms`
        });

        // ----------------------------------------
        // 10. Response
        // ----------------------------------------
        return res.status(201).json({
            success: true,
            message: "Task added successfully",
            data: task
        });

    } catch (error) {
        const totalDuration = Date.now() - startTime;

        Sentry.captureException(error, {
            tags: {
                operation: "addTask",
                component: "controller"
            },
            extra: {
                totalDuration: `${totalDuration}ms`
            }
        });

        Sentry.logger.error("Failed to add task", {
            error: error.message,
            stack: error.stack,
            totalDuration: `${totalDuration}ms`
        });

        // Handle MongoDB validation errors
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({
                success: false,
                error: "Task validation failed",
                details: Object.values(error.errors).map((err) => ({
                    field: err.path,
                    message: err.message
                }))
            });
        }

        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
};

module.exports = {
    addTask
};