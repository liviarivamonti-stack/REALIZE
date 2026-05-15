import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import type { Notification } from "@workspace/db";

type NotifTipo = Notification["tipo"];

export async function createNotification(params: {
  userId: number;
  tipo: NotifTipo;
  titulo: string;
  mensagem: string;
  clientId?: number | null;
}) {
  await db.insert(notificationsTable).values({
    userId: params.userId,
    tipo: params.tipo,
    titulo: params.titulo,
    mensagem: params.mensagem,
    clientId: params.clientId ?? null,
    lida: false,
  });
}

export async function createNotificationForRoles(params: {
  papeis: Array<"vendedor" | "cobrador" | "lider">;
  tipo: NotifTipo;
  titulo: string;
  mensagem: string;
  clientId?: number | null;
}) {
  const users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(inArray(usersTable.papel, params.papeis));

  for (const user of users) {
    await createNotification({ ...params, userId: user.id });
  }
}
