import { createServerFn } from "@tanstack/react-start";
import { connectDB } from "@/db/client";
import { User } from "@/db/models/User";
import { Member } from "@/db/models/Member"; // <-- Importado
import { Group } from "@/db/models/Group";   // <-- Importado
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bounty_secreto_para_desarrollo_2026";

export const registerUser = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; name: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();

    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) throw new Error("Este correo ya está registrado. Inicia sesión.");

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const newUser = await User.create({
      email: data.email,
      passwordHash: hashedPassword,
      name: data.name,
    });

    const token = jwt.sign(
      { userId: newUser._id.toString(), email: newUser.email },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return { 
      success: true, token, user: { id: newUser._id.toString(), name: newUser.name, email: newUser.email }, groupInfo: null 
    };
  });

export const loginUser = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();

    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user) throw new Error("Correo o contraseña incorrectos");

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) throw new Error("Correo o contraseña incorrectos");

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    // NUEVO: Buscamos si este usuario ya pertenece a una sala
    const member = await Member.findOne({ userId: user._id });
    let groupInfo = null;
    if (member) {
      const group = await Group.findById(member.groupId);
      if (group) {
        groupInfo = {
          memberId: member._id.toString(),
          groupCode: group.code,
          memberName: member.name,
          memberAvatar: member.avatar
        };
      }
    }

    return { 
      success: true, 
      token, 
      user: { id: user._id.toString(), name: user.name, email: user.email, avatar: user.avatar },
      groupInfo // Se lo devolvemos al frontend
    };
  });