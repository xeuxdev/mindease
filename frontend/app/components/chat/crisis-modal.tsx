import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  AlertTriangle,
  Phone,
  ExternalLink,
  Heart,
  Shield,
  Clock,
} from "lucide-react";
import { cn } from "~/lib/utils";

interface CrisisResource {
  id: string;
  title: string;
  description: string;
  type: string;
  contact?: string;
  available?: string;
  country: string;
  priority: number;
}

interface CrisisDetectionResult {
  isCrisis: boolean;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  keywords?: string[];
  confidence?: number;
  resources?: CrisisResource[];
}

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  crisisData: CrisisDetectionResult;
}

const severityConfig = {
  LOW: {
    color: "text-yellow-600 dark:text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: Heart,
  },
  MEDIUM: {
    color: "text-orange-600 dark:text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: AlertTriangle,
  },
  HIGH: {
    color: "text-red-600 dark:text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: Shield,
  },
  CRITICAL: {
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950/30",
    borderColor: "border-red-300 dark:border-red-700",
    icon: AlertTriangle,
  },
};

export function CrisisModal({ isOpen, onClose, crisisData }: CrisisModalProps) {
  const severity = crisisData.severity || "MEDIUM";
  const config = severityConfig[severity];
  const SeverityIcon = config.icon;

  const handleCallResource = (contact?: string) => {
    if (contact) {
      window.location.href = `tel:${contact}`;
    }
  };

  const handleOpenWebsite = (contact?: string) => {
    if (contact && (contact.startsWith("http") || contact.startsWith("www"))) {
      window.open(
        contact.startsWith("http") ? contact : `https://${contact}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[calc(100%-1.5rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        showCloseButton={true}
      >
        <DialogHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
            <div
              className={cn(
                "p-2.5 sm:p-3 rounded-full",
                config.bgColor,
                config.borderColor,
                "border",
              )}
            >
              <SeverityIcon className={cn("size-6", config.color)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg sm:text-xl">
                We're Here to Support You
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                It takes courage to reach out. You don't have to face this
                alone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Immediate Help Notice */}
          {severity === "CRITICAL" || severity === "HIGH" ? (
            <div
              className={cn(
                "p-3 sm:p-4 rounded-lg border",
                config.bgColor,
                config.borderColor,
              )}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn("size-5 mt-0.5", config.color)} />
                <div className="flex-1">
                  <h3
                    className={cn("font-semibold text-sm mb-1", config.color)}
                  >
                    Immediate Support Available
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    If you're in immediate danger or having thoughts of
                    self-harm, please reach out to a crisis helpline below or
                    call emergency services (112 or 199).
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Crisis Resources */}
          {crisisData.resources && crisisData.resources.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Phone className="size-4" />
                Crisis Support Resources
              </h3>

              <div className="space-y-3">
                {crisisData.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">
                            {resource.title}
                          </h4>
                          {resource.type === "emergency" && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                              Emergency
                            </span>
                          )}
                          {resource.type === "hotline" && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                              Hotline
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {resource.description}
                        </p>
                        {resource.available && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            <span>{resource.available}</span>
                          </div>
                        )}
                      </div>

                      {resource.contact && (
                        <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                          {resource.type === "hotline" ||
                          resource.type === "emergency" ? (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleCallResource(resource.contact)
                              }
                              className="gap-2"
                            >
                              <Phone className="size-4" />
                              {resource.contact}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleOpenWebsite(resource.contact)
                              }
                              className="gap-2"
                            >
                              <ExternalLink className="size-4" />
                              Visit
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Self-Care Tips */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Heart className="size-4" />
              Immediate Self-Care Steps
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
                <p className="text-xs sm:text-sm flex-1">
                  Take slow, deep breaths. Try breathing in for 4 counts,
                  holding for 4, and out for 4.
                </p>
              </div>
              <div className="flex items-start gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">2</span>
                </div>
                <p className="text-xs sm:text-sm flex-1">
                  Ground yourself: Notice 5 things you can see, 4 you can touch,
                  3 you can hear, 2 you can smell, and 1 you can taste.
                </p>
              </div>
              <div className="flex items-start gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">3</span>
                </div>
                <p className="text-xs sm:text-sm flex-1">
                  Reach out to someone you trust - a friend, family member, or
                  one of the helplines above.
                </p>
              </div>
              <div className="flex items-start gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">4</span>
                </div>
                <p className="text-xs sm:text-sm flex-1">
                  Remove yourself from immediate stressors if possible. Find a
                  safe, quiet space.
                </p>
              </div>
            </div>
          </div>

          {/* Important Message */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-center">
              <span className="font-semibold">Remember:</span> This AI is here
              to listen, but it's not a substitute for professional help. The
              resources above can connect you with trained professionals who
              specialize in crisis support.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              Continue Conversation
            </Button>
            <Button
              onClick={() => {
                if (crisisData.resources && crisisData.resources.length > 0) {
                  const primaryResource = crisisData.resources[0];
                  handleCallResource(primaryResource.contact);
                }
              }}
              className="flex-1 gap-2"
              disabled={
                !crisisData.resources ||
                crisisData.resources.length === 0 ||
                !crisisData.resources[0].contact
              }
            >
              <Phone className="size-4" />
              Call Crisis Helpline
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
