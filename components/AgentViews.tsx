import React, { useState } from 'react';
import { AgentRole, ComicProject, ComicPanel, Character, WorkflowStage, ResearchData } from '../types';
import { AGENTS } from '../constants';
import { Settings, ArrowLeft, FileText, CheckCircle, X, Archive, Activity, LayoutTemplate, BookOpen, Library, Smartphone, FolderOpen, TrendingUp, ShieldAlert, Send, Loader2, MessageCircle, Upload, Download, Terminal, Edit2, Search, Users, Mic, ScanFace, AlertTriangle, Palette, RefreshCw, Lock, Unlock, Globe, Trash2, ArrowRight, Video, Film, Play, UserPlus, Pencil, Sparkles, BrainCircuit, ScrollText, Feather, Lightbulb, Plus, Printer, Book, Eye, Volume2 } from 'lucide-react';

// --- MANAGER VIEW ---
interface ManagerViewProps {
    project: ComicProject;
