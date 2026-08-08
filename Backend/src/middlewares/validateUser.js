
const validateUser = (Schema) => async (req, res, next) => {

    if (!req.body) {
        return res.status(400).json({
            success: false,
            error: "Invalid or null request"
        })
    }

    const result = Schema.safeParse(req.body);

    if (!result.success) {
        console.error(" validateUser(): invalid request ('zod()')");
        console.error(`  zod(): ${result.error.issues[0].path}`);
        console.error(`       : ${result.error.issues[0].message}`);
        console.error(`       : ${req.body[result.error.issues[0].path]}`);

        const errors = {};

        result.error.issues.forEach((issue) => {
            const field = issue.path;
            errors[field] = issue.message;
        });

        return res.status(400).json({
            success: false,
            errors: errors,
        });
    }

    console.log(" validate(): Good Request, Proceeding..");

    req.body = result.data;
    next();
}

export default validateUser;