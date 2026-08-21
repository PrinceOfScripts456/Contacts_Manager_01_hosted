import bcrypt from "bcrypt";

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12); // ~400ms
}

const verifyPassword = async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
}

export { hashPassword, verifyPassword };