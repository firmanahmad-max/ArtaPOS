"use client";

import { useActionState } from "react";
import { Loader2, Store } from "lucide-react";
import { loginAction } from "@/server/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Store className="size-6" />
        </div>
        <CardTitle className="text-xl">Masuk ke ArtaPOS</CardTitle>
        <CardDescription>Dibangun untuk Toko Komputer Indonesia</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@toko.com"
              required
            />
            {state?.errors?.email && (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {state?.errors?.password && (
              <p className="text-sm text-destructive">
                {state.errors.password[0]}
              </p>
            )}
          </div>
          {state?.message && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending && <Loader2 className="animate-spin" />}
            Masuk
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
