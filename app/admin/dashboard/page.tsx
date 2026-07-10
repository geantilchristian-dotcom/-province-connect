import { redirect } from "next/navigation";

import { createClient } from "../../../lib/supabase/server";
import AdminDashboardClient from "./AdminDashboardClient";

type RoleEmploye =
  | "super_admin"
  | "admin_provincial"
  | "chef_service"
  | "agent_enregistrement"
  | "agent_cartes"
  | "caissier"
  | "agent_communication"
  | "agent_controle";

type StatutCompte =
  | "invite"
  | "actif"
  | "suspendu"
  | "desactive";

type ProfilEmploye = {
  id: string;
  matricule: string | null;
  nom_complet: string;
  email: string;
  telephone: string | null;
  service_id: string | null;
  role: RoleEmploye;
  statut: StatutCompte;
  commune: string | null;
  bureau: string | null;
};

type ServiceEmploye = {
  id: string;
  code: string;
  nom: string;
};

const ROLES_ADMINISTRATEURS: RoleEmploye[] = [
  "super_admin",
  "admin_provincial",
];

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: donneesClaims,
    error: erreurClaims,
  } = await supabase.auth.getClaims();

  const utilisateurId =
    typeof donneesClaims?.claims?.sub === "string"
      ? donneesClaims.claims.sub
      : null;

  if (erreurClaims || !utilisateurId) {
    redirect("/admin/login");
  }

  const {
    data: profilBrut,
    error: erreurProfil,
  } = await supabase
    .from("profils")
    .select(
      [
        "id",
        "matricule",
        "nom_complet",
        "email",
        "telephone",
        "service_id",
        "role",
        "statut",
        "commune",
        "bureau",
      ].join(","),
    )
    .eq("id", utilisateurId)
    .maybeSingle();

  const profil =
    profilBrut as unknown as ProfilEmploye | null;

  if (
    erreurProfil ||
    !profil ||
    profil.statut !== "actif"
  ) {
    redirect("/admin/login");
  }

  if (!ROLES_ADMINISTRATEURS.includes(profil.role)) {
    redirect("/employe/dashboard");
  }

  const requeteService = profil.service_id
    ? supabase
        .from("services")
        .select("id, code, nom")
        .eq("id", profil.service_id)
        .maybeSingle()
    : Promise.resolve({
        data: null,
        error: null,
      });

  const requeteNombreEmployes = supabase
    .from("profils")
    .select("id", {
      count: "exact",
      head: true,
    });

  const [resultatService, resultatEmployes] =
    await Promise.all([
      requeteService,
      requeteNombreEmployes,
    ]);

  const service =
    resultatService.data as unknown as
      | ServiceEmploye
      | null;

  const nombreEmployes =
    resultatEmployes.count || 0;

  return (
    <AdminDashboardClient
      profil={profil}
      service={service}
      nombreEmployesInitial={nombreEmployes}
    />
  );
}
