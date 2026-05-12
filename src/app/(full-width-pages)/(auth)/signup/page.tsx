import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar conta | Jurema Brokers",
  description: "Crie sua conta na plataforma Jurema Brokers",
};

export default function SignUp() {
  return <SignUpForm />;
}
