import { useForm } from "react-hook-form";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
} from "../ui/form";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import {
    type CreateVideo,
    createVideo,
} from "../../../../src/models/project.models";
import { Metadata } from "../../../../src/routes/project";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { API } from "../../../../src/client";
import { useCallback, useEffect, useState } from "react";
import { randomId } from "elysia/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { prompts } from "@/constants";
import Skeleton from "../ui/skeleton";
import { ChevronDown, ChevronUp, Check, Loader2, Pencil, Save, X, RefreshCw, Trash2, Upload, Share2, Download, Copy } from "lucide-react";

const formSchema = createVideo;

const defaultGenerating = {
    topic: false,
    script: false,
    imagesPrompts: false,
    images: false,
    audio: false,
    video: false,
    metadata: false,
    publish: false,
} as const;

type Generating = {
    [key in keyof typeof defaultGenerating]: boolean;
};

type VoiceOption = {
    id: string;
    label: string;
    locale: string;
    gender?: "Male" | "Female";
    provider: "edge-tts";
};

const joinUrl = (base: string, pathname: string) => {
    const cleanedBase = base.replace(/\/+$/, "");
    const cleanedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return `${cleanedBase}${cleanedPath}`;
};

// Componente para secciones colapsables
const CollapsibleSection = ({
    title,
    isOpen,
    onToggle,
    isCompleted,
    children,
}: {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    isCompleted: boolean;
    children: React.ReactNode;
}) => {
    return (
        <div className="border rounded-md mb-4 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm transition-all">
            <div
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    isOpen 
                        ? "bg-slate-50 dark:bg-slate-900 rounded-t-md border-b dark:border-slate-800" 
                        : "hover:bg-slate-50 dark:hover:bg-slate-900 rounded-md"
                }`}
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{title}</span>
                    {isCompleted && <Check className="w-4 h-4 text-green-500" />}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
            </div>
            {isOpen && (
                <div className="p-4">
                    {children}
                </div>
            )}
        </div>
    );
};

interface CreateVideoProps {
    onStatusChange: (status: string) => void;
}

const CreateVideo = ({ onStatusChange: setStatusMessage }: CreateVideoProps) => {
    const [videoId, setVideoId] = useState(randomId());
    const [video, setVideo] = useState<boolean>(false);
    const [videoTimestamp, setVideoTimestamp] = useState<number>(Date.now());
    const [audio, setAudio] = useState<boolean>(false);
    const [topic, setTopic] = useState<string>("");
    const [script, setScript] = useState<string>("");
    const [imagesPrompts, setImagesPrompts] = useState<string[]>([]);
    const [images, setImages] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [projects, setProjects] = useState<string[]>([]);
    const [metadata, setMetadata] = useState({
        title: "",
        description: "",
    });
    const [faceClips, setFaceClips] = useState<string[]>([]);
    const [faceClip, setFaceClip] = useState<string>("therock.mp4");
    const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
    const [voiceDefaults, setVoiceDefaults] = useState<Record<string, string>>({});
    const [voiceId, setVoiceId] = useState<string>("");
    const [voiceRate, setVoiceRate] = useState<number>(1.0);
    const [voicePreviewFile, setVoicePreviewFile] = useState<string>("");
    const [voicePreviewLoading, setVoicePreviewLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    
    // Estados para contexto adicional
    const [sourceUrl, setSourceUrl] = useState<string>("");
    const [contextText, setContextText] = useState<string>("");
    const [showContextOptions, setShowContextOptions] = useState<boolean>(false);

    const apiBaseUrl =
        ((import.meta as unknown as { env?: Record<string, string | undefined> })?.env?.VITE_API_BASE_URL ||
            "http://localhost:3000") as string;
    const publicBaseUrl =
        ((import.meta as unknown as { env?: Record<string, string | undefined> })?.env?.VITE_PUBLIC_BACKEND_URL ||
            apiBaseUrl) as string;

    const [isEditingTopic, setIsEditingTopic] = useState(false);
    const [isEditingScript, setIsEditingScript] = useState(false);

    const [generating, setGenerating] = useState<Generating>(defaultGenerating);
    
    // Estado para controlar qué sección está expandida
    const [expandedSection, setExpandedSection] = useState<string | null>("topic");

    const fetchProjects = useCallback(async () => {
        try {
            console.log("Fetching projects via fetch...");
            const res = await fetch(joinUrl(apiBaseUrl, "/project/list-ids"));
            if (res.ok) {
                const data = await res.json();
                console.log("Projects response:", data);
                if (Array.isArray(data)) {
                    const sortedProjects = data.reverse();
                    setProjects(sortedProjects); 
                }
            } else {
                console.error("Failed to fetch projects:", res.status, res.statusText);
            }
        } catch (e) {
            console.error("Failed to fetch projects list", e);
        }
    }, [apiBaseUrl]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const fetchFaceClips = useCallback(async () => {
        try {
            const res = await fetch(joinUrl(apiBaseUrl, "/project/face-clips"));
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setFaceClips(data);
            }
        } catch (e) {
            console.error("Failed to fetch face clips", e);
        }
    }, [apiBaseUrl]);

    useEffect(() => {
        fetchFaceClips();
    }, [fetchFaceClips]);

    const fetchVoices = useCallback(async () => {
        try {
            const res = await fetch(joinUrl(apiBaseUrl, "/project/voices"));
            if (!res.ok) return;
            const data = (await res.json()) as unknown;
            if (!data || typeof data !== "object") return;
            const voices = (data as { voices?: unknown }).voices;
            const defaults = (data as { defaults?: unknown }).defaults;
            if (Array.isArray(voices)) setVoiceOptions(voices as VoiceOption[]);
            if (defaults && typeof defaults === "object") setVoiceDefaults(defaults as Record<string, string>);
        } catch (e) {
            console.error("Failed to fetch voices", e);
        }
    }, [apiBaseUrl]);

    useEffect(() => {
        fetchVoices();
    }, [fetchVoices]);

    const saveFaceClip = async (nextFaceClip: string) => {
        try {
            setStatusMessage("Guardando face clip...");
            const res = await fetch(joinUrl(apiBaseUrl, `/project/${videoId}/face-clip`), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ faceClip: nextFaceClip }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Error guardando face clip" }));
                throw new Error(err.error || "Error guardando face clip");
            }
            setStatusMessage("Face clip guardado");
        } catch (e) {
            console.error("Failed to save face clip", e);
            setErrorMessage("Failed to save face clip");
            setStatusMessage("Error guardando face clip");
        }
    };



    const form = useForm<CreateVideo>({
        resolver: typeboxResolver(formSchema),
        defaultValues: {
            argument: "",
            language: "spanish",
            images: 6,
            sentences: 3,
            prompts: prompts,
        },
    });

    const selectedLanguage = form.watch("language");

    useEffect(() => {
        const defaultForLanguage = selectedLanguage ? voiceDefaults[selectedLanguage] : undefined;
        if (!defaultForLanguage) return;

        if (!voiceId) {
            setVoiceId(defaultForLanguage);
            return;
        }

        const stillValid = voiceOptions.some((v) => v.id === voiceId);
        if (!stillValid) setVoiceId(defaultForLanguage);
    }, [selectedLanguage, voiceDefaults, voiceId, voiceOptions]);

    const previewVoice = useCallback(async () => {
        if (!voiceId) return;
        try {
            setVoicePreviewLoading(true);
            setErrorMessage("");

            const previewText =
                (script && script.trim().slice(0, 220)) ||
                (topic && topic.trim()) ||
                "Hola, esta es una prueba de voz para MoneyPrinterV5.";

            const res = await fetch(joinUrl(apiBaseUrl, "/project/tts/preview"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    voice: voiceId,
                    text: previewText,
                    voiceRate,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                const details =
                    err && typeof err === "object" && "details" in err ? String((err as { details?: unknown }).details) : "";
                setErrorMessage(details ? `Error preview voz: ${details}` : "Error preview voz");
                return;
            }

            const data = (await res.json()) as unknown;
            const fileName =
                data && typeof data === "object" && "fileName" in data && typeof (data as { fileName?: unknown }).fileName === "string"
                    ? (data as { fileName: string }).fileName
                    : "";
            if (fileName) setVoicePreviewFile(fileName);
        } catch (e) {
            console.error("Preview voice failed", e);
            setErrorMessage("Error preview voz");
        } finally {
            setVoicePreviewLoading(false);
        }
    }, [apiBaseUrl, script, topic, voiceId, voiceRate]);

    async function generateTopic() {
        setErrorMessage("");
        setStatusMessage("Generating topic...");
        const values = form.getValues();
        setGenerating((prev) => ({ ...prev, topic: true }));
        setExpandedSection("topic"); // Asegurar que topic esté visible
        
        const payload: { argument: string; prompt: string; sourceUrl?: string; contextText?: string } = {
            argument: values.argument,
            prompt: values.prompts.topic,
        };

        if (sourceUrl) payload.sourceUrl = sourceUrl;
        if (contextText) payload.contextText = contextText;

        const topicResponse = await API.project
            .create({ id: videoId })
            .topic.post(payload);
        
        setGenerating((prev) => ({ ...prev, topic: false }));

        if (topicResponse.error) {
            setErrorMessage("Error generating topic");
            return;
        }

        setTopic(topicResponse.data);
        setStatusMessage("Topic generated. Please review and continue.");
    }

    async function generateScript() {
        setErrorMessage("");
        setStatusMessage("Generating script...");
        const values = form.getValues();
        setGenerating((prev) => ({ ...prev, script: true }));
        setExpandedSection("script");
        
        const scriptResponse = await API.project
            .create({ id: videoId })
            .script.post({
                language: values.language,
                prompt: values.prompts.script,
                sentences: values.sentences.toString(),
                topic: topic,
            });

        setGenerating((prev) => ({ ...prev, script: false }));

        if (scriptResponse.error) {
             setErrorMessage("Error generating script");
             return;
        }

        setScript(scriptResponse.data);
        setStatusMessage("Script generated. Please review and continue.");
    }

    async function generateImagePrompts() {
        setErrorMessage("");
        setStatusMessage("Generating image prompts...");
        const values = form.getValues();
        setGenerating((prev) => ({ ...prev, imagesPrompts: true }));
        setExpandedSection("imagesPrompts");
        
        const imagesPromptsResponse = await API.project
            .create({ id: videoId })
            .imagePrompts.post({
                images: values.images.toString(),
                prompt: values.prompts.image,
                script: script,
                topic: topic,
            });
        
        setGenerating((prev) => ({ ...prev, imagesPrompts: false }));

        if (imagesPromptsResponse.error) {
             setErrorMessage("Error generating image prompts");
             return;
        }

        const promptsData = Array.isArray(imagesPromptsResponse.data) ? (imagesPromptsResponse.data as string[]) : [];
        setImagesPrompts(promptsData);
        setStatusMessage("Image prompts generated. Please review and generate images.");
    }

    const generateImages = async () => {
        setErrorMessage("");
        let count = 0;
        for (const prompt of imagesPrompts) {
            count++;
            setStatusMessage(`Generating image ${count} of ${imagesPrompts.length}...`);
            const image = await API.project.create({ id: videoId }).image.post({
                prompt: prompt,
                videoId: videoId,
            });
            if (image.error) {
                setErrorMessage(`Failed to generate image ${count}`);
            } else {
                const imageName = typeof image.data === "string" ? image.data : null;
                if (imageName) {
                    setImages((prevImages) => [...prevImages, imageName]);
                } else {
                    setErrorMessage(`Failed to generate image ${count}`);
                }
            }
        }
        setGenerating((prev) => ({ ...prev, images: false, audio: true }));
        setStatusMessage("Generating audio (TTS)...");
        setExpandedSection("audio"); // Auto-expandir audio
        
        const _audio = await API.project.create({ id: videoId }).sts.post({
            script: script,
            language: form.getValues().language,
            voice: voiceId || undefined,
            voiceRate,
        });
        setGenerating((prev) => ({ ...prev, audio: false }));

        if (_audio.error) {
            const errorValue = _audio.error.value as unknown;
            const errorDetail =
                errorValue && typeof errorValue === "object" && "details" in errorValue
                    ? String((errorValue as { details?: unknown }).details)
                    : JSON.stringify(errorValue);
            setErrorMessage(`Error generating audio: ${errorDetail}`);
            setStatusMessage("Audio generation failed.");
        } else {
            setAudio(_audio.data ? true : false);
            setStatusMessage("Process completed successfully!");
        }
    };

    const handleDeleteImage = async (imageName: string) => {
        if (!confirm("Are you sure you want to delete this image?")) return;
        
        try {
            const res = await fetch(joinUrl(apiBaseUrl, `/project/${videoId}/images/${imageName}`), {
                method: "DELETE"
            });
            if (res.ok) {
                setImages(prev => prev.filter(img => img !== imageName));
            } else {
                 setErrorMessage("Failed to delete image");
            }
        } catch (e) {
            console.error("Failed to delete image", e);
            setErrorMessage("Failed to delete image");
        }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("image", file);
        
        try {
            setStatusMessage("Uploading image...");
            const res = await fetch(joinUrl(apiBaseUrl, `/project/${videoId}/images/upload`), {
                method: "POST",
                body: formData
            });
            
            if (res.ok) {
                const data = (await res.json()) as unknown;
                const imageName =
                    data && typeof data === "object" && "imageName" in data && typeof (data as { imageName?: unknown }).imageName === "string"
                        ? (data as { imageName: string }).imageName
                        : null;
                if (imageName) setImages((prev) => [...prev, imageName]);
                setStatusMessage("Image uploaded successfully");
            } else {
                throw new Error("Upload failed");
            }
        } catch (e) {
            console.error("Failed to upload image", e);
            setErrorMessage("Failed to upload image");
        }
    };

    const fetchVideoData = useCallback(async () => {
        try {
            const response = await API.project({
                id: videoId,
            }).get();
            if (!response.data || !response.data.argument) return false;
            else {
                const data = response.data as Metadata;
                form.setValue("argument", data.argument);
                form.setValue("language", data.language);
                form.setValue("sentences", data.sentences);
                form.setValue("images", data.images);
                setTopic(data.topic);
                setScript(data.script);
                setImagesPrompts(data.imagesPrompts);
                setImages(data.imagesPath);
                setAudio(data.audio);
                setVideo(data.video);
                setMetadata({
                    title: data.title,
                    description: data.description,
                });
                setFaceClip(data.faceClip || "therock.mp4");
                
                // Set initial expanded section based on progress
                if (data.video) setExpandedSection(null);
                else if (data.audio) setExpandedSection("audio");
                else if (data.imagesPath.length > 0) setExpandedSection("images");
                else if (data.imagesPrompts.length > 0) setExpandedSection("imagesPrompts");
                else if (data.script) setExpandedSection("script");
                else if (data.topic) setExpandedSection("topic");
                
                setStatusMessage("Project data loaded");
                return data.video;
            }
        } catch (e) {
            console.error("Error fetching video data", e);
            setStatusMessage("Error loading project data");
            return false;
        }
    }, [form, setStatusMessage, videoId]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = joinUrl(apiBaseUrl, `/project/${videoId}/video`);
        link.download = `${metadata.title || 'video'}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        try {
            setStatusMessage("Preparing video for sharing...");
            const response = await fetch(joinUrl(apiBaseUrl, `/project/${videoId}/video`));
            const blob = await response.blob();
            const file = new File([blob], `${metadata.title || 'video'}.mp4`, { type: 'video/mp4' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: metadata.title || 'Generated Video',
                    text: metadata.description || 'Check out this AI generated video!',
                });
                setStatusMessage("Share dialog opened.");
            } else {
                // Fallback: trigger download if share not supported
                handleDownload();
                setStatusMessage("Sharing not supported, downloading instead.");
            }
        } catch (error) {
            console.error("Error sharing:", error);
            // Fallback to download on error
            handleDownload();
            setStatusMessage("Error sharing, downloading instead.");
        }
    };

    const generateVideo = async () => {
        setStatusMessage("Generating video (this may take a while)...");
        setGenerating((prev) => ({ ...prev, video: true }));
        
        try {
            const response = await API.project
                .create({
                    id: videoId,
                })
                .post();

            if (response.error) {
                console.warn("Video generation request failed, checking if video was created anyway...", response.error);
                setStatusMessage("Request timed out. Verifying video creation...");
                await new Promise(resolve => setTimeout(resolve, 2000));
                const isVideoCreated = await fetchVideoData();
                
                if (isVideoCreated) {
                    setStatusMessage("Video verified! Generation was successful.");
                } else {
                    setErrorMessage("Error generating video (Timeout)");
                    setStatusMessage("Video generation failed.");
                }
            } else {
                if (response) {
                    setVideo(true);
                    setVideoTimestamp(Date.now());
                }
                setStatusMessage("Video generated!");
            }
        } catch (error) {
             console.error("Network error during video generation", error);
             setStatusMessage("Network error. Verifying video creation...");
             await new Promise(resolve => setTimeout(resolve, 2000));
             const isVideoCreated = await fetchVideoData();
             
             if (isVideoCreated) {
                 setStatusMessage("Video verified! Generation was successful.");
             } else {
                 setErrorMessage("Error generating video (Network Error)");
                 setStatusMessage("Video generation failed.");
             }
        }
        
        setGenerating((prev) => ({ ...prev, video: false }));
    };

    const generateMetadata = async () => {
        setStatusMessage("Generating metadata...");
        setGenerating((prev) => ({ ...prev, metadata: true }));
        const _metadata = await API.project({ id: videoId }).metadata.get();
        if (!_metadata) {
            setStatusMessage("Metadata generation failed");
            setGenerating((prev) => ({ ...prev, metadata: false }));
            return;
        }
        const md = _metadata.data as { title?: string; description?: string } | null | undefined;
        setMetadata({
            title: md?.title ?? "",
            description: md?.description ?? "",
        });
        setStatusMessage("Metadata generated!");
        setGenerating((prev) => ({ ...prev, metadata: false }));
    };

    const publish = async () => {
        setStatusMessage("Publishing to YouTube...");
        setGenerating((prev) => ({ ...prev, publish: true }));
        
        try {
            const response = await API.project({
                id: videoId,
            }).publish.get();

            const publishData = response.data as { success?: boolean; error?: string } | null | undefined;
            if (publishData?.success) {
                setStatusMessage("Published successfully!");
                alert("Published Successfully!");
            } else {
                const errorMsg = publishData?.error || "Unknown error";
                console.error("Publish error:", errorMsg);
                setStatusMessage(`Publish failed: ${errorMsg}`);
                alert(`Publish failed: ${errorMsg}`);
            }
        } catch (e) {
            console.error("Publish exception:", e);
            setStatusMessage("Publish failed (Network/Server Error)");
            alert("Publish failed (Network/Server Error)");
        } finally {
            setGenerating((prev) => ({ ...prev, publish: false }));
        }
    };

    useEffect(() => {
        fetchVideoData();
    }, [fetchVideoData]);

    // Removed auto-trigger for generateImages to allow editing prompts
    // useEffect(() => {
    //    if (imagesPrompts.length && !images.length) generateImages();
    // }, [imagesPrompts]);

    const imagescount = form.watch('images')


    return (
        <div className="grid grid-cols-[25%_1fr_25%] min-h-screen">
            <form className="flex flex-col gap-2 p-5 border-e">
                <Form {...form}>
                    <div className="flex flex-col gap-2 mb-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Project / Video ID</label>
                        <div className="flex gap-2">
                            <Select onValueChange={(value) => setVideoId(value)} value={videoId}>
                                <SelectTrigger className="w-full bg-white dark:bg-slate-950">
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map((project) => (
                                        <SelectItem key={project} value={project}>
                                            {project}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button type="button" size="icon" variant="outline" onClick={fetchProjects} title="Refresh Project List">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                            Current ID: <span className="font-mono">{videoId}</span>
                        </div>
                        <div className="mt-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Face Clip</label>
                            <div className="flex gap-2 mt-1">
                                <Select
                                    onValueChange={(value) => {
                                        setFaceClip(value);
                                        saveFaceClip(value);
                                    }}
                                    value={faceClip}
                                >
                                    <SelectTrigger className="w-full bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="Selecciona un face clip" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguno</SelectItem>
                                        {faceClips.map((clip) => (
                                            <SelectItem key={clip} value={clip}>
                                                {clip}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="button" size="icon" variant="outline" onClick={fetchFaceClips} title="Refresh Face Clips">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <FormDescription>
                        Setup the next AI Generated Video
                    </FormDescription>
                    <div className="grid grid-cols-2 items-center gap-3">
                        <FormField
                            name="argument"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Argument</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g. 3 curiosities about Mars" />
                                    </FormControl>
                                    <FormDescription>
                                        The main topic or idea for your video.
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="language"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Language</FormLabel>
                                    <FormControl>
                                        <select
                                            {...field}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800"
                                        >
                                            <option value="english">English</option>
                                            <option value="spanish">Spanish</option>
                                            <option value="french">French</option>
                                            <option value="german">German</option>
                                            <option value="italian">Italian</option>
                                            <option value="portuguese">Portuguese</option>
                                            <option value="russian">Russian</option>
                                            <option value="japanese">Japanese</option>
                                            <option value="chinese">Chinese</option>
                                        </select>
                                    </FormControl>
                                    <FormDescription>
                                        Target language for the script and audio.
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-2 items-center gap-3">
                        <FormField
                            name="images"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Images</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="number" />
                                    </FormControl>
                                    <FormDescription>
                                        Number of images to generate.
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="sentences"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sentences</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="number" />
                                    </FormControl>
                                    <FormDescription>
                                        Script length (sentences per paragraph).
                                    </FormDescription>
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormLabel>Prompts</FormLabel>
                    
                    {/* Sección de Contexto Adicional (URL/Texto) */}
                    <div className="mb-4 p-3 border rounded-md bg-slate-50 dark:bg-slate-900">
                        <div 
                            className="flex items-center justify-between cursor-pointer mb-2"
                            onClick={() => setShowContextOptions(!showContextOptions)}
                        >
                            <span className="text-sm font-semibold flex items-center gap-2">
                                <Pencil className="w-3 h-3" /> Additional Context (Optional)
                            </span>
                            {showContextOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                        
                        {showContextOptions && (
                            <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-top-1">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Source URL (Web Scraping)</label>
                                    <Input 
                                        placeholder="https://example.com/article" 
                                        value={sourceUrl}
                                        onChange={(e) => setSourceUrl(e.target.value)}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">The AI will read this page to extract context.</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Paste Text / Document Content</label>
                                    <Textarea 
                                        placeholder="Paste technical specs, article content, or notes here..." 
                                        value={contextText}
                                        onChange={(e) => setContextText(e.target.value)}
                                        rows={4}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <FormDescription>
                        You can use dynamic tags that will be changed during the
                        creation process. Supported tags are:{" "}
                        <b>
                            %ARGUMENT%, %TOPIC%, %SCRIPT%, %SENTENCES%,
                            %IMAGES%, %LANGUAGE%
                        </b>
                        .
                    </FormDescription>
                    <FormField
                        name="prompts.topic"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Topic</FormLabel>
                                <FormControl>
                                    <Textarea rows={4} {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="prompts.script"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Script</FormLabel>
                                <FormControl>
                                    <Textarea rows={6} {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="prompts.image"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Image</FormLabel>
                                <FormControl>
                                    <Textarea rows={6} {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button loading={generating.topic} type="button" onClick={generateTopic}>
                        Create
                    </Button>
                </Form>
            </form>
            <div className="flex flex-col gap-3 p-5 border-e h-screen overflow-y-auto pb-40">
                {errorMessage && (
                    <div className="bg-red-100 dark:bg-red-950 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 mb-2 rounded shadow-sm">
                        <p className="font-bold">Error</p>
                        <p>{errorMessage}</p>
                    </div>
                )}

                <CollapsibleSection 
                    title="Topic" 
                    isOpen={expandedSection === "topic"} 
                    onToggle={() => setExpandedSection(expandedSection === "topic" ? null : "topic")}
                    isCompleted={!!topic}
                >
                    {
                        generating.topic ?
                        <Skeleton /> :
                        <div className="flex flex-col gap-2">
                            {isEditingTopic ? (
                                <div className="flex flex-col gap-2">
                                    <Textarea 
                                        value={topic} 
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="min-h-[100px] bg-white dark:bg-slate-950"
                                        placeholder="Enter your topic here..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button size="sm" onClick={() => setIsEditingTopic(false)} variant="outline">
                                            <Save className="w-4 h-4 mr-1" /> Done
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group p-2 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
                                    <span className="whitespace-pre-wrap">{topic}</span>
                                    {topic && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-slate-100 dark:bg-slate-800"
                                            onClick={() => setIsEditingTopic(true)}
                                            title="Edit Topic"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                            
                            {topic && !script && !isEditingTopic && (
                                <Button onClick={generateScript} loading={generating.script} className="w-full">
                                    Generate Script
                                </Button>
                            )}
                        </div>
                    }
                </CollapsibleSection>

                <CollapsibleSection 
                    title="Script" 
                    isOpen={expandedSection === "script"} 
                    onToggle={() => setExpandedSection(expandedSection === "script" ? null : "script")}
                    isCompleted={!!script}
                >
                    {
                        generating.script ?
                        <Skeleton height={64} /> :
                        <div className="flex flex-col gap-2">
                            {isEditingScript ? (
                                <div className="flex flex-col gap-2">
                                    <Textarea 
                                        value={script} 
                                        onChange={(e) => setScript(e.target.value)}
                                        className="min-h-[200px] bg-white dark:bg-slate-950"
                                        placeholder="Enter your script here..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button size="sm" onClick={() => setIsEditingScript(false)} variant="outline">
                                            <Save className="w-4 h-4 mr-1" /> Done
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group p-2 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
                                    <span className="whitespace-pre-wrap">{script}</span>
                                    {script && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-slate-100 dark:bg-slate-800"
                                            onClick={() => setIsEditingScript(true)}
                                            title="Edit Script"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            )}

                            {script && imagesPrompts.length === 0 && !isEditingScript && (
                                <Button onClick={generateImagePrompts} loading={generating.imagesPrompts} className="w-full">
                                    Generate Image Prompts
                                </Button>
                            )}
                        </div>
                    }
                </CollapsibleSection>

                <CollapsibleSection 
                    title="Image Prompts" 
                    isOpen={expandedSection === "imagesPrompts"} 
                    onToggle={() => setExpandedSection(expandedSection === "imagesPrompts" ? null : "imagesPrompts")}
                    isCompleted={imagesPrompts.length > 0}
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4">
                            {
                                generating.imagesPrompts ?
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Generating image prompts...
                                </div>
                                :
                                imagesPrompts.length > 0 ? (
                                    imagesPrompts.map((prompt, i) => (
                                        <div key={i} className="flex flex-col gap-1 p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                                            <span className="font-bold text-xs text-slate-500 uppercase tracking-wider">Prompt #{i+1}</span>
                                            <Textarea 
                                                value={prompt} 
                                                onChange={(e) => {
                                                    const newPrompts = [...imagesPrompts];
                                                    newPrompts[i] = e.target.value;
                                                    setImagesPrompts(newPrompts);
                                                }}
                                                className="text-sm min-h-[80px] bg-white dark:bg-slate-950"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-slate-400 italic">No prompts generated yet</span>
                                )
                            }
                        </div>
                        {imagesPrompts.length > 0 && (
                            <Button 
                                onClick={generateImages} 
                                disabled={generating.images || images.length > 0} 
                                loading={generating.images}
                                className="w-full shadow-lg"
                            >
                                Generate Images ({imagesPrompts.length})
                            </Button>
                        )}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection 
                    title="Images" 
                    isOpen={expandedSection === "images"} 
                    onToggle={() => setExpandedSection(expandedSection === "images" ? null : "images")}
                    isCompleted={images.length > 0}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {
                            images.map((image, i) => (
                                <div key={i} className="relative group cursor-pointer" onClick={() => setSelectedImage(image)}>
                                    <img src={joinUrl(apiBaseUrl, `/project/${videoId}/images/${image}`)} className="w-full h-full object-cover rounded shadow-sm hover:shadow-md transition-all aspect-square" />
                                    <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">#{i+1}</div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteImage(image);
                                        }}
                                        className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Image"
                                        type="button"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        }
                        
                        <div className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors relative">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={handleUploadImage}
                            />
                            <Upload className="w-6 h-6 text-slate-400 mb-1" />
                            <span className="text-xs text-slate-500">Upload</span>
                        </div>

                        {
                            generating.images ?
                            Array( imagescount - images.length ).fill(0).map( (_, i) => 
                                <div className="aspect-square bg-slate-200 dark:bg-slate-800 rounded animate-pulse flex items-center justify-center" key={i}>
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                </div>
                            )
                            : ''
                        }
                    </div>
                </CollapsibleSection>

                <CollapsibleSection 
                    title="Audio" 
                    isOpen={expandedSection === "audio"} 
                    onToggle={() => setExpandedSection(expandedSection === "audio" ? null : "audio")}
                    isCompleted={audio}
                >
                    <div className="mb-4 grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Voz (Edge TTS)</label>
                            <select
                                value={voiceId}
                                onChange={(e) => setVoiceId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800"
                            >
                                <option value="">Seleccionar voz...</option>
                                {voiceOptions.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.label} ({v.id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Velocidad ({voiceRate.toFixed(2)}x)
                            </label>
                            <input
                                type="range"
                                min="0.8"
                                max="1.5"
                                step="0.05"
                                value={voiceRate}
                                onChange={(e) => setVoiceRate(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={previewVoice}
                                    disabled={!voiceId || voicePreviewLoading}
                                    loading={voicePreviewLoading}
                                >
                                    Probar voz
                                </Button>
                                {voicePreviewFile ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setVoicePreviewFile("")}
                                    >
                                        Limpiar preview
                                    </Button>
                                ) : null}
                            </div>
                            {voicePreviewFile ? (
                                <audio controls className="w-full" key={voicePreviewFile}>
                                    <source
                                        src={joinUrl(apiBaseUrl, `/project/preview/audio/${voicePreviewFile}`)}
                                        type="audio/mpeg"
                                    />
                                </audio>
                            ) : null}
                        </div>
                    </div>
                    {
                        generating.audio ?
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" /> Generating audio...
                        </div>: 
                        audio ? (
                            <div>
                                <audio controls className="w-full">
                                    <source
                                        src={joinUrl(apiBaseUrl, `/project/${videoId}/audio`)}
                                        type="audio/mpeg"
                                    />
                                </audio>
                                <div className="mt-4 flex gap-2">
                                    <Button loading={generating.video} onClick={generateVideo} className="flex-1">
                                        Generate video
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={fetchVideoData} title="Check Video Status" disabled={generating.video}>
                                        <RefreshCw className={`w-4 h-4 ${generating.video ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <span className="text-slate-400 italic">Audio not generated yet</span>
                        )
                    }
                </CollapsibleSection>
            </div>
            <div className="flex flex-col gap-3 p-5">
                <b>Result Video</b>
                {video ? (
                    <>
                        <video controls className="rounded w-full" key={`${videoId}-${videoTimestamp}`}>
                            <source
                                src={joinUrl(apiBaseUrl, `/project/${videoId}/video?t=${videoTimestamp}`)}
                            />
                        </video>
                        <div className="flex gap-2 mt-2 w-full">
                             <Button onClick={handleShare} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                 <Share2 className="w-4 h-4 mr-2" /> Share Video
                             </Button>
                             <Button variant="outline" onClick={handleDownload} title="Download Video">
                                 <Download className="w-4 h-4" />
                             </Button>
                        </div>
                    </>
                ) : (
                    <div
                        className={`aspect-[9/16] flex flex-col items-center font-semibold justify-center bg-slate-200 dark:bg-slate-800 w-full rounded ${generating.video ? "animate-pulse" : ""}`}
                    >
                        {generating.video ? (
                            "Generating the video..."
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-slate-400">No video yet</span>
                                <Button variant="ghost" size="sm" onClick={fetchVideoData} className="text-xs">
                                    <RefreshCw className="w-3 h-3 mr-1" /> Check Status
                                </Button>
                            </div>
                        )}
                    </div>
                )}
                <b>Metadata</b>
                <Button
                    disabled={!video}
                    loading={generating.metadata}
                    onClick={generateMetadata}
                >
                    Generate
                </Button>
                <b>Title</b>
                {
                    generating.metadata ?
                    <Skeleton /> : 
                    <span className="text-sm">{metadata.title}</span>
                }
                <b>Description</b>
                {
                    generating.metadata ?
                    <Skeleton />
                    : <span className="text-sm">{metadata.description}</span>
                }
                <Button disabled={!video || !metadata.title} onClick={publish}>
                    Publish
                </Button>
            </div>
            
            {/* Image Preview Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" 
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-2">
                        <div className="absolute bottom-4 left-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-black/60 backdrop-blur rounded-lg p-3 border border-white/10">
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={joinUrl(publicBaseUrl, `/project/${videoId}/images/${selectedImage}`)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={async () => {
                                            const url = joinUrl(publicBaseUrl, `/project/${videoId}/images/${selectedImage}`);
                                            await navigator.clipboard.writeText(url);
                                            setStatusMessage("URL pública copiada");
                                        }}
                                        title="Copiar URL pública"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <img 
                            src={joinUrl(apiBaseUrl, `/project/${videoId}/images/${selectedImage}`)} 
                            alt={selectedImage || "Preview"}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()} 
                        />
                        <Button 
                            size="icon" 
                            variant="secondary" 
                            className="absolute top-4 right-4 rounded-full shadow-lg hover:bg-white"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateVideo;
