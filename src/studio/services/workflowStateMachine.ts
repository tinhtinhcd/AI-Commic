
import { ComicProject, WorkflowStage } from "../types";

interface StageConfig {
    previous: WorkflowStage | null;
    next: WorkflowStage | null;
    label: string;
    /**
     * Checks if the project has the necessary data to consider this stage "Complete"
     * and ready to move to the next.
     */
    isComplete: (project: ComicProject) => boolean;
}

export const WORKFLOW_CONFIG: Record<WorkflowStage, StageConfig> = {
    [WorkflowStage.IDLE]: {
        previous: null,
        next: WorkflowStage.RESEARCHING,
        label: 'Idle',
        isComplete: (p) => !!p.theme || !!p.originalScript
    },
    [WorkflowStage.RESEARCHING]: {
        previous: WorkflowStage.IDLE,
        next: WorkflowStage.SCRIPTING,
        label: 'Research',
        isComplete: (p) => !!p.marketAnalysis && !!p.storyConcept
    },
    [WorkflowStage.SCRIPTING]: {
        previous: WorkflowStage.RESEARCHING,
        next: WorkflowStage.CENSORING_SCRIPT,
        label: 'Scripting',
        isComplete: (p) => (p.panels && p.panels.length > 0) || (!!p.originalScript)
    },
    [WorkflowStage.CENSORING_SCRIPT]: {
        previous: WorkflowStage.SCRIPTING,
        next: WorkflowStage.DESIGNING_CHARACTERS,
        label: 'Censorship',
        isComplete: (p) => !!p.censorReport && !p.isCensored
    },
    [WorkflowStage.DESIGNING_CHARACTERS]: {
        previous: WorkflowStage.CENSORING_SCRIPT,
        next: WorkflowStage.VISUALIZING_PANELS,
        label: 'Character Design',
        isComplete: (p) => p.characters.length > 0 && p.characters.every(c => !!c.imageUrl)
    },
    [WorkflowStage.VISUALIZING_PANELS]: {
        previous: WorkflowStage.DESIGNING_CHARACTERS,
        next: WorkflowStage.PRINTING,
        label: 'Visualizing',
        isComplete: (p) => p.panels.length > 0 && p.panels.some(panel => !!panel.imageUrl)
    },
    [WorkflowStage.PRINTING]: {
        previous: WorkflowStage.VISUALIZING_PANELS,
        next: WorkflowStage.POST_PRODUCTION,
        label: 'Layout & Printing',
        isComplete: (p) => true // Manual approval step usually
    },
    [WorkflowStage.POST_PRODUCTION]: {
        previous: WorkflowStage.PRINTING,
        next: WorkflowStage.COMPLETED,
        label: 'Post Production',
        isComplete: (p) => true // Manual finalization
    },
    [WorkflowStage.COMPLETED]: {
        previous: WorkflowStage.POST_PRODUCTION,
        next: null,
        label: 'Completed',
        isComplete: (p) => true
    }
};

export const WorkflowStateMachine = {
    /**
     * Determines if the project can legally transition to the target stage.
     * Enforces linear progression: You must complete Previous to enter Target.
     */
    canTransitionTo: (project: ComicProject, targetStage: WorkflowStage): { allowed: boolean; reason?: string } => {
        const config = WORKFLOW_CONFIG[targetStage];
        
        // 1. Allow reverting to any previous stage (or same stage) anytime
        // We find the index of current and target to compare
        const stages = Object.values(WorkflowStage);
        const currentIdx = stages.indexOf(project.workflowStage);
        const targetIdx = stages.indexOf(targetStage);

        if (targetIdx <= currentIdx) {
            return { allowed: true };
        }

        // 2. Strict Linear Progression for moving forward
        // To enter Target, the Previous stage must be the Current stage AND it must be complete.
        if (config.previous) {
            if (project.workflowStage !== config.previous) {
                return { allowed: false, reason: `Cannot jump to ${config.label}. You must complete ${WORKFLOW_CONFIG[config.previous].label} first.` };
            }

            const prevConfig = WORKFLOW_CONFIG[config.previous];
            if (!prevConfig.isComplete(project)) {
                return { allowed: false, reason: `Previous stage (${prevConfig.label}) is incomplete. Missing required assets.` };
            }
        }

        return { allowed: true };
    },

    /**
     * Gets the next valid stage based on current state
     */
    getNextStage: (project: ComicProject): WorkflowStage | null => {
        const currentConfig = WORKFLOW_CONFIG[project.workflowStage];
        return currentConfig.next;
    },

    /**
     * Gets the previous stage
     */
    getPreviousStage: (project: ComicProject): WorkflowStage | null => {
        const currentConfig = WORKFLOW_CONFIG[project.workflowStage];
        return currentConfig.previous;
    }
};
