import fs from "fs";
import path from "path";
import { EXPORT_DIR } from "./exportPath.js";

const downloadExportFile = (req, res) => {

    const fileName = req.params.filename;

    const resolvedPath = path.resolve(EXPORT_DIR, fileName);

    if (!resolvedPath.startsWith(path.resolve(EXPORT_DIR) + path.sep)) {
        console.error(" downloadExportFile(): invalid filename/path");
        return res.status(400).json({ message: "Invalid filename" });
    }

    if (!fs.existsSync(resolvedPath)) {
        console.error(` downloadExportFile(): file not found -> ${fileName}`);
        return res.status(404).json({ error: "File not found" });
    }

    console.log(` downloadExportFile(): sending -> ${fileName}`);

    return res.download(resolvedPath, fileName, (err) => {
        if (err) {
            console.error(" downloadExportFile(): stream error", err);
        }
    });
}


export { downloadExportFile };