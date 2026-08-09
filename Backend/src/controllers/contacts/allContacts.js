import Contact from "../../models/contact.js";

const fetchContacts = async (req, res) => {

    try {

        const MAX_LIMIT = 1000;
        const DEFAULT_LIMIT = 1000;

        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || DEFAULT_LIMIT;

        if (page < 1) page = 1;
        if (limit < 1) limit = DEFAULT_LIMIT;
        if (limit > MAX_LIMIT) limit = MAX_LIMIT;

        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.search) {
            const escapeRegex = (str) =>
                str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            const search = escapeRegex(req.query.search);
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { firstName: regex },
                { lastName: regex },
                { "phones.number": regex },
                { "emails.email": regex },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $concat: ["$firstName", " ", "$lastName"] },
                            regex: search,
                            options: "i"
                        }
                    }
                }
            ];
        }

        const [contacts, total] = await Promise.all([
            Contact.find(filter)
                .sort({ _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Contact.countDocuments(filter)
        ]);


        console.log(` fetchContacts(): Sending ${contacts.length} Contacts`, req.query.search ? `, search: '${req.query.search}'` : "");

        return res.status(200).json({
            contacts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: skip + contacts.length < total,
                hasPrevPage: page > 1
            }
        });

    } catch (err) {
        console.error(" fetchContacts():", err);

        return res.status(500).json({
            error: 'Failed to fetch contacts'
        });
    }
};


export { fetchContacts };