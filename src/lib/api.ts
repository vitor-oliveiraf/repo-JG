import axios from "axios";
import { QueryClient, queryOptions } from "@tanstack/react-query";
import type { ApiError, User } from "../domain";
let visitor = localStorage.getItem("kurio.visitor");
if (!visitor) {
  visitor = crypto.randomUUID();
  localStorage.setItem("kurio.visitor", visitor);
}
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 6000,
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kurio.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["x-visitor-id"] = visitor;
  return config;
});
api.interceptors.response.use(
  (r) => {
    const sent = r.config.headers.Authorization;
    const current = localStorage.getItem("kurio.token");
    if (sent && sent !== `Bearer ${current}`)
      throw new axios.CanceledError(
        "Resposta de uma sessão anterior descartada.",
      );
    return r;
  },
  (error) => {
    if (
      error.response?.status === 401 &&
      localStorage.getItem("kurio.token") &&
      error.config?.headers?.Authorization ===
        `Bearer ${localStorage.getItem("kurio.token")}`
    ) {
      localStorage.removeItem("kurio.token");
      window.dispatchEvent(new Event("kurio:expired"));
    }
    return Promise.reject(error);
  },
);
export const message = (error: unknown) =>
  axios.isAxiosError<ApiError>(error)
    ? error.response?.data?.message ||
      (error.code === "ECONNABORTED"
        ? "A resposta demorou mais que o esperado. Tente recuperar a operação."
        : "Falha de conexão. Confira a rede e tente novamente.")
    : error instanceof Error
      ? error.message
      : "Não foi possível concluir a operação.";
export const fields = (error: unknown) =>
  axios.isAxiosError<ApiError>(error)
    ? error.response?.data?.fields
    : undefined;
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      retry: (count, error) =>
        count < 1 &&
        (!axios.isAxiosError(error) ||
          !error.response ||
          error.response.status >= 500),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
export const sessionOptions = () =>
  queryOptions({
    queryKey: ["session"],
    queryFn: async ({ signal }): Promise<User | null> => {
      if (!localStorage.getItem("kurio.token")) return null;
      try {
        return (await api.get<User>("/auth/session", { signal })).data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401)
          return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 15000,
  });
export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    localStorage.removeItem("kurio.token");
    await queryClient.cancelQueries();
    queryClient.clear();
    queryClient.setQueryData(["session"], null);
    window.dispatchEvent(new Event("kurio:logout"));
  }
}
