import upload from "./importContacts.js";

const validateFile = (req, res, next) => {

    upload.single("file")(req, res, (err) => {

        if (err) {

            if (err.code === "LIMIT_FILE_SIZE") {
                console.error(" validateFile(): file exceeded Max filesize");
                return res.status(400).json({ error: "File is too large. Maximum size is 5 MB." });
            }

            console.error(" validateFile():", err.message || err);
            return res.status(400).json({ error: "file validation failed" });
        }

        next();
    });
}

export default validateFile;