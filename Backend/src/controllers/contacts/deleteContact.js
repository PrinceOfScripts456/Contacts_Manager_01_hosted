import Contact from "../../models/contact.js";

const deleteContactById = async (req, res) => {

    try {

        const deletedContact = await Contact.findByIdAndDelete(req.params.id);

        if (!deletedContact) {
            console.error(" deleteContactById(): contact not found");

            return res.status(404).json({
                success: false,
                message: "Contact not founds"
            });
        }

        console.log(" deleteContactById(): Contact Deleted");

        return res.status(200).json({
            contact: deletedContact,
            message: "Contact deleted successfully"
        });

    } catch (err) {
        console.error(" deleteContactById(): ", err);

        return res.status(500).json({
            error: "Error occurred while deleting"
        });
    }
};

export { deleteContactById };