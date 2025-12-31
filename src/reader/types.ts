
// Reader-specific types
export interface ComicPanel {
  id: string;
  description: string;
  dialogue: string;
  caption?: string; 
  imageUrl?: string;
}

export interface StoryConcept {
    premise: string;
}

export interface ComicProject {
  id?: string;
  ownerId?: string;
  title: string;
  theme: string;
  style: string;
  currentChapter?: number;
  coverImage?: string;
  panels: ComicPanel[];
  storyConcept?: StoryConcept;
  // Minimal set needed for reading
}
