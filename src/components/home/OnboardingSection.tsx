import { useNavigate } from 'react-router-dom';
import { OnboardingTipCard } from '@/components/OnboardingTipCard';
import { Wine, FolderOpen, Users } from 'lucide-react';
import { OnboardingStep } from '@/types/profile';

interface OnboardingSectionProps {
  isStepVisible: (step: OnboardingStep) => boolean;
  dismissStep: (step: OnboardingStep) => void;
  drinkCount: number;
  onAddClick: () => void;
}

export function OnboardingSection({
  isStepVisible,
  dismissStep,
  drinkCount,
  onAddClick,
}: OnboardingSectionProps) {
  const navigate = useNavigate();

  const hasVisibleSteps =
    isStepVisible('welcome') ||
    (isStepVisible('add_drink') && drinkCount > 0) ||
    (isStepVisible('collections') && drinkCount >= 2) ||
    (isStepVisible('social') && drinkCount >= 3);

  if (!hasVisibleSteps) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-3 mb-4">
      {isStepVisible('welcome') && (
        <OnboardingTipCard
          title="Welcome to Pour Decisions!"
          description="Your personal drink journal. Start by adding your first drink to build your library."
          icon={<Wine className="w-5 h-5" />}
          actionLabel="Add your first drink"
          onAction={onAddClick}
          onDismiss={() => dismissStep('welcome')}
          variant="highlight"
        />
      )}

      {isStepVisible('add_drink') && drinkCount > 0 && (
        <OnboardingTipCard
          title="Great start!"
          description="Keep logging drinks to track your favorites. Tap any drink to see details, rate it, or add notes."
          icon={<Wine className="w-5 h-5" />}
          onDismiss={() => dismissStep('add_drink')}
        />
      )}

      {isStepVisible('collections') && drinkCount >= 2 && (
        <OnboardingTipCard
          title="Organize with Collections"
          description="Create curated groups like 'Summer Favorites' or 'Gift Ideas' to organize drinks from your library."
          icon={<FolderOpen className="w-5 h-5" />}
          actionLabel="View Collections"
          onAction={() => navigate('/collections')}
          onDismiss={() => dismissStep('collections')}
        />
      )}

      {isStepVisible('social') && drinkCount >= 3 && (
        <OnboardingTipCard
          title="Connect with friends"
          description="Follow other users to see their drink discoveries in your feed. Share your profile to let friends find you."
          icon={<Users className="w-5 h-5" />}
          actionLabel="Explore the feed"
          onAction={() => navigate('/feed')}
          onDismiss={() => dismissStep('social')}
        />
      )}
    </div>
  );
}
