import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar | Jurema Brokers",
  description: "Acesse a plataforma Jurema Brokers",
};

export default function SignIn() {
  return <SignInForm />;
}
