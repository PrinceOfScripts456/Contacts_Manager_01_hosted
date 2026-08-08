const validate = (schema) => (req, res, next) => {

    const result = schema.safeParse(req.body);

    if (!result.success) {
        console.error(" validate(): invalid request ('zod()')");
        console.error(`  zod(): ${result.error.issues[0].path}`);
        console.error(`       : ${result.error.issues[0].message}`);
        console.error(`       : ${req.body[result.error.issues[0].path]}`);

        const errors = {};

        result.error.issues.forEach((issue) => {
            const field = issue.path;
            errors[field] = issue.message;
        });

        let errMsg;
        if (result.error.issues[0].path[0] == "firstName") errMsg = "Invalid first name";
        else if (result.error.issues[0].path[0] == "lastName") errMsg = "Invalid last name";
        else if (result.error.issues[0].path[0] == "emails") errMsg = result.error.issues[0].message;
        else if (result.error.issues[0].path[0] == "website") errMsg = result.error.issues[0].message;
        else errMsg = result.error.issues[0].path[0] + result.error.issues[0].message;

        return res.status(400).json({
            success: false,
            message: errMsg
        });
    }

    console.log(" validate(): Good Request, Proceeding..");

    req.body = result.data;
    next();
};

export default validate;