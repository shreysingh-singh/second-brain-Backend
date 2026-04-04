import { email, z } from "zod"

export const signupZod = z.object({
    email: z.string().min(3 , "email is to short"),
    username: z.string().min(3 , "User name is too short"),
    password: z.string().min(4 , "Password is too short")
});
