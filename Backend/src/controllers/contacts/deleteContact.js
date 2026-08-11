import Contact from "../../models/contact.js";

const deleteContactById = async (req, res, next) => {

    try {

        const deletedContact = await Contact.findOneAndDelete({ _id: req.params.id, user: req.userId });

        if (!deletedContact) {
            console.error(" deleteContactById(): contact not found");

            return res.status(404).json({
                message: "Contact not found."
            });
        }

        console.log(" deleteContactById(): Contact Deleted");

        return res.status(200).json({
            contact: deletedContact,
            message: "Contact deleted successfully"
        });

    } catch (err) {
        console.error(" deleteContactById(): ", err.message || err);
        return next(err);
    }
};

export { deleteContactById };