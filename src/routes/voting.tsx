import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { FloatingNav } from "@/components/FloatingNav";
import { startVoting, voteChallenge, getVotingStatus } from "@/api/challenges.server";
import { getStoredMemberId, getStoredGroupCode } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Check, X, ArrowRight, Trophy } from "lucide-react";

export const Route = createFileRoute("/voting")({
  head: () => ({
    meta: [
      { title: "Bounty · Votación" },
      { name: "description", content: "Vota los retos de la noche." },
    ],
  }),
  component: Voting,
});

function Voting() {
  const navigate = useNavigate();
  const memberId = getStoredMemberId();
  const groupCode = getStoredGroupCode();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["pendingChallenges", groupCode],
    queryFn: async () => {
      const { getMemberChallenges } = await import("@/api/challenges.server");
      const result = await getMemberChallenges({ data: { memberId: memberId!, groupCode: groupCode! } });
      return result.filter((c: any) => c.status === "pending" || c.status === "voting");
    },
    enabled: !!memberId && !!groupCode,
  });

  const startVotingMutation = useMutation({
    mutationFn: (challengeId: string) => startVoting({ data: { challengeId, adminId: memberId! } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingChallenges"] });
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ challengeId, vote }: { challengeId: string; vote: boolean }) =>
      voteChallenge({ data: { challengeId, memberId: memberId!, vote } }),
    onSuccess: (result) => {
      setHasVoted(true);
      if (result.status === "done" || result.status === "available") {
        setShowResult(true);
      }
      queryClient.invalidateQueries({ queryKey: ["pendingChallenges"] });
    },
  });

  const currentChallenge = challenges[currentIndex];

  const handleVote = (vote: boolean) => {
    if (!currentChallenge) return;
    voteMutation.mutate({ challengeId: currentChallenge.id, vote });
  };

  const nextChallenge = () => {
    if (currentIndex < challenges.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setHasVoted(false);
      setShowResult(false);
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  if (isLoading) {
    return (
      <PhoneFrame>
        <TopBar title="Votación" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
        <FloatingNav />
      </PhoneFrame>
    );
  }

  if (challenges.length === 0) {
    return (
      <PhoneFrame>
        <TopBar title="Votación" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-5">
          <Trophy size={48} className="text-muted-foreground mb-4" />
          <div className="text-center">
            <div className="text-lg font-medium">No hay votaciones pendientes</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Cuando el admin inicie una votación, aparecerá aquí
            </div>
          </div>
          <Link to="/dashboard" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-medium">
            Volver al Dashboard
          </Link>
        </div>
        <FloatingNav />
      </PhoneFrame>
    );
  }

  if (showResult) {
    return (
      <PhoneFrame>
        <TopBar title="Votación" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-5">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-2xl font-medium">¡Votación completada!</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {voteMutation.data?.approved !== false ? "El reto fue aprobado" : "El reto fue rechazado"}
            </div>
          </div>
          <button
            onClick={nextChallenge}
            className="mt-6 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium"
          >
            {currentIndex < challenges.length - 1 ? "Siguiente reto" : "Ver resultados"}
            <ArrowRight size={16} />
          </button>
        </div>
        <FloatingNav />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <TopBar
        title="Votación"
        right={
          <div className="text-xs text-muted-foreground">
            {currentIndex + 1}/{challenges.length}
          </div>
        }
      />
      <div className="px-5 pb-40">
        <div className="mt-2 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Nivel {currentChallenge?.level}
          </div>
          <h1 className="mt-1 text-2xl leading-tight">{currentChallenge?.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{currentChallenge?.description}</p>
        </div>

        {(currentChallenge as any)?.submittedMedia && (
          <div className="mt-6 overflow-hidden rounded-3xl hairline">
            <img
              src={(currentChallenge as any).submittedMedia}
              alt="Reto"
              className="h-full w-full object-cover"
              style={{ maxHeight: "400px" }}
            />
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-card p-5 hairline">
          <div className="text-center">
            <div className="text-3xl font-light gradient-text">{currentChallenge?.points}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">puntos</div>
          </div>
        </div>

        {!hasVoted ? (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleVote(false)}
              disabled={voteMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-full bg-destructive/10 py-4 text-destructive disabled:opacity-50"
            >
              <X size={20} /> No
            </button>
            <button
              onClick={() => handleVote(true)}
              disabled={voteMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-full bg-green-500/10 py-4 text-green-500 disabled:opacity-50"
            >
              <Check size={20} /> Sí
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Has votado en este reto
            </div>
            <button
              onClick={nextChallenge}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium"
            >
              {currentIndex < challenges.length - 1 ? "Siguiente reto" : "Ver resultados"}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
      <FloatingNav />
    </PhoneFrame>
  );
}