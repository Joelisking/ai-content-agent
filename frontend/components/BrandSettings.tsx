import React, { useState, useEffect } from 'react';
import { FaSave, FaPlus, FaTimes, FaEdit, FaBuilding, FaBullhorn, FaBan, FaEnvelope, FaUsers, FaClock, FaCalendarAlt, FaImage } from 'react-icons/fa';
import { apiClient, Brand, GenerationSchedule } from '../lib/api/client';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

export const BrandSettings: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    // We can't initialize with null, we'll rely on selectedBrand populating these or empty strings
    const [name, setName] = useState('');
    const [industry, setIndustry] = useState('');
    const [voiceTone, setVoiceTone] = useState<string[]>([]);
    const [targetAudience, setTargetAudience] = useState('');
    const [keyMessages, setKeyMessages] = useState<string[]>([]);
    const [doNotMention, setDoNotMention] = useState<string[]>([]);
    const [approverEmails, setApproverEmails] = useState<string[]>([]);

    // Input states for array fields
    const [newTone, setNewTone] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [newDoNotMention, setNewDoNotMention] = useState('');
    const [newApproverEmail, setNewApproverEmail] = useState('');

    // Generation schedule state
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
    const [scheduleDays, setScheduleDays] = useState<number[]>([1]); // Monday default
    const [scheduleTimes, setScheduleTimes] = useState<string[]>(['09:00']);
    const [schedulePlatforms, setSchedulePlatforms] = useState<string[]>([]);
    const [scheduleAutoImage, setScheduleAutoImage] = useState(false);
    const [schedulePromptTemplate, setSchedulePromptTemplate] = useState('');
    const [newScheduleTime, setNewScheduleTime] = useState('09:00');
    const [savingSchedule, setSavingSchedule] = useState(false);

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        setLoading(true);
        try {
            const response = await apiClient.getBrands();
            setBrands(response.data);
            if (response.data.length > 0) {
                selectBrand(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
            toast.error('Failed to load brands');
        } finally {
            setLoading(false);
        }
    };

    const selectBrand = (brand: Brand) => {
        setSelectedBrand(brand);
        setName(brand.name);
        setIndustry(brand.industry);
        setVoiceTone([...brand.voiceTone]);
        setTargetAudience(brand.targetAudience);
        setKeyMessages([...brand.keyMessages]);
        setDoNotMention([...brand.doNotMention]);
        setApproverEmails(brand.approverEmails ? [...brand.approverEmails] : []);

        // Load generation schedule if exists
        const schedule = brand.generationSchedule;
        if (schedule) {
            setScheduleEnabled(schedule.enabled);
            setScheduleFrequency(schedule.frequency);
            setScheduleDays(schedule.daysOfWeek || [1]);
            setScheduleTimes(schedule.timesOfDay || ['09:00']);
            setSchedulePlatforms(schedule.platforms || []);
            setScheduleAutoImage(schedule.autoGenerateImage);
            setSchedulePromptTemplate(schedule.promptTemplate || '');
        } else {
            // Reset to defaults
            setScheduleEnabled(false);
            setScheduleFrequency('daily');
            setScheduleDays([1]);
            setScheduleTimes(['09:00']);
            setSchedulePlatforms([]);
            setScheduleAutoImage(false);
            setSchedulePromptTemplate('');
        }
    };

    const handleSave = async () => {
        if (!selectedBrand) return;

        setSaving(true);
        try {
            const response = await apiClient.updateBrand(selectedBrand._id, {
                name,
                industry,
                voiceTone,
                targetAudience,
                keyMessages,
                doNotMention,
                approverEmails,
            });

            // Update local state
            const updatedBrand = response.data;
            setBrands(brands.map(b => b._id === selectedBrand._id ? updatedBrand : b));
            setSelectedBrand(updatedBrand);
            toast.success('Brand settings updated successfully');
        } catch (error) {
            console.error('Error updating brand:', error);
            toast.error('Failed to update brand settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSchedule = async () => {
        if (!selectedBrand) return;

        setSavingSchedule(true);
        try {
            const schedule: GenerationSchedule = {
                enabled: scheduleEnabled,
                frequency: scheduleFrequency,
                daysOfWeek: scheduleDays,
                timesOfDay: scheduleTimes,
                platforms: schedulePlatforms as ('linkedin' | 'instagram' | 'twitter' | 'facebook')[],
                autoGenerateImage: scheduleAutoImage,
                promptTemplate: schedulePromptTemplate || undefined,
            };

            const response = await apiClient.updateBrandSchedule(selectedBrand._id, schedule);

            // Update local state
            const updatedBrand = response.data;
            setBrands(brands.map(b => b._id === selectedBrand._id ? updatedBrand : b));
            setSelectedBrand(updatedBrand);
            toast.success('Content generation schedule updated');
        } catch (error) {
            console.error('Error updating schedule:', error);
            toast.error('Failed to update generation schedule');
        } finally {
            setSavingSchedule(false);
        }
    };

    const toggleDay = (day: number) => {
        setScheduleDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
        );
    };

    const togglePlatform = (platform: string) => {
        setSchedulePlatforms(prev =>
            prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
        );
    };

    const addScheduleTime = () => {
        if (newScheduleTime && !scheduleTimes.includes(newScheduleTime)) {
            setScheduleTimes(prev => [...prev, newScheduleTime].sort());
        }
    };

    const removeScheduleTime = (time: string) => {
        setScheduleTimes(prev => prev.filter(t => t !== time));
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const platformOptions = [
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'twitter', label: 'Twitter/X' },
        { value: 'facebook', label: 'Facebook' },
    ];

    const addToArray = (
        value: string,
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        inputSetter: React.Dispatch<React.SetStateAction<string>>
    ) => {
        if (value.trim()) {
            setter(prev => [...prev, value.trim()]);
            inputSetter('');
        }
    };

    const removeFromArray = (
        index: number,
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    if (loading && brands.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground animate-pulse">Loading brand configuration...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Brand Settings</h2>
                    <p className="text-muted-foreground">Manage your brand identity, voice, and guidelines</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Brand Selection Sidebar (if multiple) */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">Select Brand</CardTitle>
                        <CardDescription>Choose a brand profile to edit</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select
                            value={selectedBrand?._id}
                            onValueChange={(val) => {
                                const brand = brands.find(b => b._id === val);
                                if (brand) selectBrand(brand);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a brand" />
                            </SelectTrigger>
                            <SelectContent>
                                {brands.map((brand) => (
                                    <SelectItem key={brand._id} value={brand._id}>{brand.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedBrand && (
                            <div className="mt-6 space-y-4">
                                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                                    <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Active Profile</div>
                                    <div className="font-medium truncate">{selectedBrand.name}</div>
                                    <div className="text-sm text-muted-foreground truncate">{selectedBrand.industry}</div>
                                </div>

                                <Button className="w-full" disabled variant="outline">
                                    <FaPlus className="mr-2 h-3 w-3" /> Create New Brand
                                </Button>
                                <p className="text-xs text-center text-muted-foreground px-2">
                                    Multi-brand support is limited in this version.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Main Edit Area */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedBrand ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FaBuilding className="text-primary" /> Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Brand Name</Label>
                                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="industry">Industry</Label>
                                            <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="audience">Target Audience</Label>
                                        <Textarea
                                            id="audience"
                                            value={targetAudience}
                                            onChange={(e) => setTargetAudience(e.target.value)}
                                            rows={3}
                                            placeholder="Describe your ideal customer persona..."
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FaBullhorn className="text-blue-500" /> Voice & Messaging
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Voice Tone */}
                                    <div className="space-y-3">
                                        <Label>Voice & Tone</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {voiceTone.map((tone, index) => (
                                                <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                                    {tone}
                                                    <button onClick={() => removeFromArray(index, setVoiceTone)} className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors">
                                                        <FaTimes size={10} />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={newTone}
                                                onChange={(e) => setNewTone(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addToArray(newTone, setVoiceTone, setNewTone)}
                                                placeholder="Add tone (e.g. Professional, Witty)..."
                                            />
                                            <Button size="icon" onClick={() => addToArray(newTone, setVoiceTone, setNewTone)} variant="secondary">
                                                <FaPlus size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Key Messages */}
                                    <div className="space-y-3">
                                        <Label>Key Messages</Label>
                                        <div className="space-y-2">
                                            {keyMessages.map((msg, index) => (
                                                <div key={index} className="flex items-start justify-between p-3 rounded-md bg-muted/50 text-sm">
                                                    <span>{msg}</span>
                                                    <button onClick={() => removeFromArray(index, setKeyMessages)} className="text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                                                        <FaTimes size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addToArray(newMessage, setKeyMessages, setNewMessage)}
                                                placeholder="Add a key message..."
                                            />
                                            <Button size="icon" onClick={() => addToArray(newMessage, setKeyMessages, setNewMessage)} variant="secondary">
                                                <FaPlus size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FaBan className="text-destructive" /> Guidelines & Restrictions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Do Not Mention */}
                                    <div className="space-y-3">
                                        <Label>Do Not Mention (Negative Constraints)</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {doNotMention.map((item, index) => (
                                                <Badge key={index} variant="destructive" className="pl-2 pr-1 py-1 flex items-center gap-1 opacity-90">
                                                    {item}
                                                    <button onClick={() => removeFromArray(index, setDoNotMention)} className="hover:bg-black/20 rounded-full p-0.5 transition-colors">
                                                        <FaTimes size={10} />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={newDoNotMention}
                                                onChange={(e) => setNewDoNotMention(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addToArray(newDoNotMention, setDoNotMention, setNewDoNotMention)}
                                                placeholder="Add topic to avoid..."
                                            />
                                            <Button size="icon" onClick={() => addToArray(newDoNotMention, setDoNotMention, setNewDoNotMention)} variant="secondary">
                                                <FaPlus size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FaUsers className="text-purple-500" /> Approvals
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Label>Approver Emails</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {approverEmails.map((email, index) => (
                                            <Badge key={index} variant="outline" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                                <FaEnvelope className="mr-1 h-3 w-3 opacity-50" />
                                                {email}
                                                <button onClick={() => removeFromArray(index, setApproverEmails)} className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors">
                                                    <FaTimes size={10} />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newApproverEmail}
                                            onChange={(e) => setNewApproverEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addToArray(newApproverEmail, setApproverEmails, setNewApproverEmail)}
                                            placeholder="Add approver email..."
                                        />
                                        <Button size="icon" onClick={() => addToArray(newApproverEmail, setApproverEmails, setNewApproverEmail)} variant="secondary">
                                            <FaPlus size={14} />
                                        </Button>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end pt-6 border-t bg-muted/10">
                                    <Button onClick={handleSave} disabled={saving} size="lg" className="w-full md:w-auto">
                                        {saving ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                                Saving Changes...
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="mr-2" /> Save Brand Settings
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* Content Generation Schedule */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FaCalendarAlt className="text-green-500" /> Auto Content Generation
                                    </CardTitle>
                                    <CardDescription>
                                        Schedule automatic content generation for this brand
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Enable/Disable Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Enable Scheduled Generation</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Automatically generate content at scheduled times
                                            </p>
                                        </div>
                                        <Switch
                                            checked={scheduleEnabled}
                                            onCheckedChange={setScheduleEnabled}
                                        />
                                    </div>

                                    {scheduleEnabled && (
                                        <>
                                            {/* Frequency Selection */}
                                            <div className="space-y-3">
                                                <Label>Frequency</Label>
                                                <Select
                                                    value={scheduleFrequency}
                                                    onValueChange={(v) => setScheduleFrequency(v as 'daily' | 'weekly' | 'custom')}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="custom">Custom Days</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Days of Week (for weekly/custom) */}
                                            {(scheduleFrequency === 'weekly' || scheduleFrequency === 'custom') && (
                                                <div className="space-y-3">
                                                    <Label>Days of Week</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {dayNames.map((day, index) => (
                                                            <Button
                                                                key={day}
                                                                variant={scheduleDays.includes(index) ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => toggleDay(index)}
                                                                className="w-12"
                                                            >
                                                                {day}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Times of Day */}
                                            <div className="space-y-3">
                                                <Label className="flex items-center gap-2">
                                                    <FaClock className="text-muted-foreground" /> Times of Day
                                                </Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {scheduleTimes.map((time) => (
                                                        <Badge key={time} variant="secondary" className="pl-3 pr-1 py-1.5 text-sm">
                                                            {time}
                                                            <button
                                                                onClick={() => removeScheduleTime(time)}
                                                                className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                                                            >
                                                                <FaTimes size={10} />
                                                            </button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="time"
                                                        value={newScheduleTime}
                                                        onChange={(e) => setNewScheduleTime(e.target.value)}
                                                        className="w-32"
                                                    />
                                                    <Button size="icon" onClick={addScheduleTime} variant="secondary">
                                                        <FaPlus size={14} />
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Add multiple times to generate content several times per day
                                                </p>
                                            </div>

                                            {/* Platforms */}
                                            <div className="space-y-3">
                                                <Label>Platforms to Generate For</Label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {platformOptions.map((platform) => (
                                                        <div
                                                            key={platform.value}
                                                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                                schedulePlatforms.includes(platform.value)
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'hover:bg-muted/50'
                                                            }`}
                                                            onClick={() => togglePlatform(platform.value)}
                                                        >
                                                            <Checkbox
                                                                checked={schedulePlatforms.includes(platform.value)}
                                                                onCheckedChange={() => togglePlatform(platform.value)}
                                                            />
                                                            <Label className="cursor-pointer">{platform.label}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Auto-generate Image */}
                                            <div className="flex items-center justify-between p-4 rounded-lg border">
                                                <div className="flex items-center gap-3">
                                                    <FaImage className="text-purple-500" />
                                                    <div className="space-y-0.5">
                                                        <Label>Auto-generate Images</Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Use AI to generate images with content
                                                        </p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={scheduleAutoImage}
                                                    onCheckedChange={setScheduleAutoImage}
                                                />
                                            </div>

                                            {/* Prompt Template */}
                                            <div className="space-y-3">
                                                <Label>Prompt Template (Optional)</Label>
                                                <Textarea
                                                    value={schedulePromptTemplate}
                                                    onChange={(e) => setSchedulePromptTemplate(e.target.value)}
                                                    placeholder="E.g., 'Create engaging content about our latest product features' or leave blank for general content"
                                                    rows={3}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    This prompt will guide the AI when generating scheduled content
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-end pt-6 border-t bg-muted/10">
                                    <Button onClick={handleSaveSchedule} disabled={savingSchedule} variant="outline" size="lg" className="w-full md:w-auto">
                                        {savingSchedule ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                Saving Schedule...
                                            </>
                                        ) : (
                                            <>
                                                <FaCalendarAlt className="mr-2" /> Save Schedule Settings
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                            <FaBuilding className="text-6xl mb-4 opacity-10" />
                            <p className="text-lg font-medium">No brand selected</p>
                            <p className="text-sm">Please select a brand from the list to edit settings.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
