import { redirect } from "next/navigation";

export default function Home() {
  // Proxy memastikan hanya user terautentikasi yang sampai di sini.
  redirect("/dashboard");
}
