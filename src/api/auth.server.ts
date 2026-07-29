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
      success: true, 
      token, 
      user: { id: newUser._id.toString(), name: newUser.name, email: newUser.email }, 
      groupsList: [] // <-- Cambiado de groupInfo: null a un array vacío
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

    // NUEVO FLUJO: Buscamos TODOS los grupos a los que pertenece el usuario
    const members = await Member.find({ userId: user._id });
    const groupsList = [];
    
    // Recorremos cada perfil de miembro que tiene el usuario
    if (members && members.length > 0) {
      for (const member of members) {
        const group = await Group.findById(member.groupId);
        if (group) {
          groupsList.push({
            groupId: group._id.toString(), // <-- Añadido: vital para que el frontend sepa a dónde navegar
            memberId: member._id.toString(),
            groupCode: group.code,
            // groupName: group.name, <-- Descomenta esto si tu modelo Group tiene un campo 'name' para pintarlo en el Lobby
            memberName: member.name,
            memberAvatar: member.avatar
          });
        }
      }
    }

    return { 
      success: true, 
      token, 
      user: { id: user._id.toString(), name: user.name, email: user.email, avatar: user.avatar },
      groupsList // <-- Devolvemos el array entero al frontend
    };
  });