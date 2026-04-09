import { Heart, MessageCircle, Share2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import CommentItem from "./CommentItem";
import { DiaryEntry, FriendDiaryEntry } from "../services/storage";

interface DiaryCardProps {
  entry: DiaryEntry | FriendDiaryEntry;
  /** 是否为好友日记模式（隐藏删除按钮，显示好友信息） */
  isFriend?: boolean;
  /** 当前用户信息，仅在 isFriend=false 时使用 */
  userAvatar?: string;
  userNickname?: string;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onShare: (entry: DiaryEntry | FriendDiaryEntry) => void;
  onDelete?: (id: string) => void;
  onDeleteComment?: (diaryId: string, commentId: string) => void;
}

export default function DiaryCard({
  entry,
  isFriend = false,
  userAvatar,
  userNickname,
  onLike,
  onComment,
  onShare,
  onDelete,
  onDeleteComment,
}: DiaryCardProps) {
  const friendEntry = isFriend ? (entry as FriendDiaryEntry) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={entry.id}
      id={entry.id}
      className="miao-card !p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${isFriend ? 'bg-secondary/10' : 'bg-primary/10'} rounded-full overflow-hidden border-2 border-white shadow-sm`}>
            <img
              src={isFriend ? friendEntry!.authorAvatar : (userAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=miao_default")}
              alt={isFriend ? friendEntry!.authorNickname : "Avatar"}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-on-surface">
                {isFriend ? friendEntry!.authorNickname : (userNickname || "喵星人")}
              </p>
              {isFriend && friendEntry && (
                <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[8px] font-black rounded-full uppercase tracking-tighter">
                  {friendEntry.catName}
                </span>
              )}
            </div>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              {new Date(entry.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {!isFriend && onDelete && (
          <button
            onClick={() => onDelete(entry.id)}
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant/40 hover:text-red-500 hover:bg-red-50 rounded-full transition-all mr-2"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Media */}
      {entry.media && (
        <div className="aspect-square w-full bg-surface-container flex items-center justify-center overflow-hidden">
          {entry.mediaType === 'video' ? (
            <video src={entry.media} controls className="w-full h-full object-cover" />
          ) : (
            <img src={entry.media} alt="Diary media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          )}
        </div>
      )}

      {/* Content & Actions */}
      <div className="p-6">
        <p className="text-on-surface text-base font-medium leading-relaxed mb-6 whitespace-pre-wrap">
          {entry.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onLike(entry.id)}
              className={`flex items-center gap-2 transition-all ${entry.isLiked ? "text-red-500 scale-110" : "text-on-surface-variant hover:text-primary"}`}
            >
              <Heart size={24} fill={entry.isLiked ? "currentColor" : "none"} />
              <span className="text-xs font-black">{entry.likes}</span>
            </button>
            <button
              onClick={() => onComment(entry.id)}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-all"
            >
              <MessageCircle size={24} />
              <span className="text-xs font-black">{entry.comments.length}</span>
            </button>
          </div>
          <button
            onClick={() => onShare(entry)}
            className="text-on-surface-variant hover:text-primary transition-all"
          >
            <Share2 size={24} />
          </button>
        </div>

        {/* Comments */}
        {entry.comments.length > 0 && (
          <div className="mt-6 pt-6 border-t border-outline-variant/30 space-y-3">
            {entry.comments.map((comment) => (
              <div key={comment.id}>
                {!isFriend && onDeleteComment ? (
                  <CommentItem
                    comment={comment}
                    diaryId={entry.id}
                    onDelete={onDeleteComment}
                  />
                ) : (
                  <div className="flex gap-2">
                    <span className="text-xs font-black text-secondary shrink-0">好友:</span>
                    <p className="text-xs text-on-surface-variant font-medium">{comment.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
