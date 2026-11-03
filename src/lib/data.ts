import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, sessionOptions } from "./api";
import type { Cart, CartItem, Nft, Quote, User } from "../domain";
export function useSession() {
  return useQuery(sessionOptions());
}
export function useOwner() {
  const { data } = useSession();
  return data?.id || "guest";
}
export function useCart() {
  const owner = useOwner();
  return useQuery({
    queryKey: ["cart", owner],
    queryFn: async ({ signal }) =>
      (await api.get<Cart>("/cart", { signal })).data,
  });
}
export function useQuote() {
  const owner = useOwner();
  return useQuery({
    queryKey: ["quote", owner],
    queryFn: async ({ signal }) =>
      (await api.get<Quote>("/quote", { signal })).data,
  });
}
export function useCartMutation() {
  const client = useQueryClient();
  const owner = useOwner();
  return useMutation({
    mutationFn: async (item: CartItem & { mode?: "add" }) =>
      (await api.put<Cart>("/cart/items", item)).data,
    onSuccess: async (cart) => {
      client.setQueryData(["cart", owner], cart);
      await client.invalidateQueries({ queryKey: ["quote", owner] });
    },
  });
}
export function useFavorites() {
  const owner = useOwner();
  return useQuery({
    queryKey: ["favorites", owner],
    enabled: owner !== "guest",
    queryFn: async ({ signal }) =>
      (await api.get<string[]>("/favorites", { signal })).data,
  });
}
export function useFavoriteMutation() {
  const client = useQueryClient();
  const owner = useOwner();
  const key = ["favorites", owner];
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await api.put<string[]>(`/favorites/${id}`, { active })).data,
    onMutate: async ({ id, active }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<string[]>(key) || [];
      client.setQueryData(
        key,
        active
          ? [...new Set([...previous, id])]
          : previous.filter((i) => i !== id),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (
        context &&
        client.getQueryData<User | null>(["session"])?.id === owner
      )
        client.setQueryData(key, context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}
export function useNft(id: string) {
  return useQuery({
    queryKey: ["nft", id],
    queryFn: async ({ signal }) =>
      (await api.get<Nft>(`/nfts/${id}`, { signal })).data,
  });
}
