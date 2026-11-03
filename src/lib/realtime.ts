import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "./data";
import type { DomainEvent, Nft, Order } from "../domain";
export function useRealtime() {
  const client = useQueryClient();
  const { data: user } = useSession();
  const [state, setState] = useState("Conectando");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    const versions = new Map<string, number>();
    const socket = io(import.meta.env.VITE_SOCKET_URL || location.origin, {
      transports: ["websocket"],
      auth: { token: localStorage.getItem("kurio.token") || "" },
      reconnectionDelay: 700,
    });
    const reconcile = () => {
      if (!active) return;
      setState("Conectado");
      void client.invalidateQueries({
        predicate: (q) =>
          ["nfts", "nft", "cart", "quote", "order", "orders"].includes(
            String(q.queryKey[0]),
          ),
      });
    };
    socket.on("connect", reconcile);
    socket.on("disconnect", () => {
      if (active) setState("Reconectando");
    });
    socket.on("connect_error", () => {
      if (active) setState("Sem conexão em tempo real");
    });
    const accept = (type: string, e: DomainEvent<Nft | Order>) => {
      if (!active || (e.userId && e.userId !== user?.id)) return false;
      const key = `${type}:${e.resourceId}`;
      const cached = client.getQueryData<Nft | Order>([
        type === "nft" ? "nft" : "order",
        e.resourceId,
        ...(type === "order" ? [user?.id] : []),
      ]);
      const version = Math.max(versions.get(key) || 0, cached?.version || 0);
      if (e.version <= version) return false;
      versions.set(key, e.version);
      return true;
    };
    socket.on("nft.updated", (e: DomainEvent<Nft>) => {
      if (!accept("nft", e)) return;
      client.setQueryData(["nft", e.resourceId], e.data);
      void client.invalidateQueries({ queryKey: ["nfts"] });
      void client.invalidateQueries({ queryKey: ["quote"] });
      void client.invalidateQueries({ queryKey: ["cart"] });
      setNotice(
        `${e.data.name}: preço ou disponibilidade atualizado. Revise seu carrinho.`,
      );
    });
    socket.on("order.updated", (e: DomainEvent<Order>) => {
      if (!accept("order", e)) return;
      const key = ["order", e.resourceId, user?.id];
      const current = client.getQueryData<Order>(key);
      if (current && current.status !== "pending") return;
      client.setQueryData(key, e.data);
      void client.invalidateQueries({ queryKey: ["orders", user?.id] });
      if (e.data.status !== "pending") {
        void client.invalidateQueries({ queryKey: ["cart"] });
        void client.invalidateQueries({ queryKey: ["quote"] });
      }
      setNotice(
        e.data.status === "confirmed"
          ? "Pedido confirmado."
          : e.data.status === "refused"
            ? "Pagamento recusado. Seus itens foram preservados."
            : "Pedido em processamento.",
      );
    });
    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [client, user?.id]);
  return { state, notice, setNotice };
}
