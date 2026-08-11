
const validateUser = (Schema) => async (req, res, next) => {

    const SENSITIVE_FIELDS = ["password", "currentPassword", "newPassword"];

    if (!req.body) {
        return res.status(400).json({ error: "Invalid or null request" });
    }

    const result = Schema.safeParse(req.body);

    if (!result.success) {
        const path = result.error.issues[0].path[0];

        console.error(" validateUser(): invalid request ('zod()')");
        console.error(`  zod(): ${path}`);
        console.error(`       : ${result.error.issues[0].message}`);
        console.error(`       : ${SENSITIVE_FIELDS.includes(path) ? '[sensitive]' : req.body[path]}`);

        const errors = {};

        result.error.issues.forEach((issue) => {
            const field = issue.path;
            errors[field] = issue.message;
        });

        return res.status(400).json({ errors });
    }

    console.log(" validate(): Good Request, Proceeding..");

    req.body = result.data;
    return next();
}

export default validateUser;