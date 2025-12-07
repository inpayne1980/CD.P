import React from 'react';
import { Link } from 'react-router-dom';
import { RoutePath } from '../types';
import { Zap, Video, Image, MessageSquare, MapPin, Search, Cpu } from 'lucide-react';

const FeatureCard: React.FC<{
  title: string;
  desc: string;
  icon: React.ReactNode;
  to: RoutePath;
  color: string;
}> = ({ title, desc, icon, to, color }) => (
  <Link
    to={to}
    className="group relative overflow-hidden p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all hover:shadow-2xl hover:shadow-blue-900/20"
  >
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 100 })}
    </div>
    <div className={`mb-4 inline-flex p-3 rounded-lg ${color} bg-opacity-20 text-white`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </Link>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Welcome to the Future
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Explore the full capabilities of the Gemini API. From real-time voice conversations to cinematic video generation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          title="Live Audio"
          desc="Real-time, low-latency voice conversations with Gemini 2.5 Native Audio."
          icon={<Zap />}
          to={RoutePath.LIVE}
          color="bg-amber-500"
        />
        <FeatureCard
          title="Veo Video"
          desc="Generate 1080p cinematic videos from text or image prompts using Veo 3.1."
          icon={<Video />}
          to={RoutePath.VIDEO}
          color="bg-purple-500"
        />
        <FeatureCard
          title="Image Studio"
          desc="Generate 4K images with Nano Banana Pro and edit them with Flash Image."
          icon={<Image />}
          to={RoutePath.IMAGE}
          color="bg-pink-500"
        />
        <FeatureCard
          title="Assistant"
          desc="Chat with Search & Maps grounding, audio transcription, and TTS."
          icon={<MessageSquare />}
          to={RoutePath.ASSISTANT}
          color="bg-blue-500"
        />
         <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center text-center">
            <Cpu className="text-slate-600 mb-2" size={32} />
            <h3 className="text-slate-400 font-semibold">Model Status</h3>
            <div className="mt-2 flex gap-2 flex-wrap justify-center">
                <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded border border-green-900">Gemini 2.5</span>
                <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded border border-purple-900">Veo 3.1</span>
                <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-900">Pro 3.0</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;