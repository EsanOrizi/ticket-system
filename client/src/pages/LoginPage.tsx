import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "../lib/auth-client";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    const { error } = await authClient.signIn.email(data);
    if (error) {
      setServerError(error.message ?? "Invalid email or password.");
    } else {
      navigate("/");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Sign in</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="text"
              autoComplete="email"
              {...register("email")}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"}`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${errors.password ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"}`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>
          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
