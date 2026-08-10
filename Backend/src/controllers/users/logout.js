const logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
    });

    return res.status(200).json({ message: "Logged out successfully" });
};

export default logout;