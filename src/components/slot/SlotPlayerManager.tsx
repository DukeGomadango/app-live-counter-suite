"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Trash2, Pencil, Check, X } from "lucide-react";
import type { SlotPlayer } from "@/lib/slot";
import { useGlassStyle } from "@/hooks/useGlassStyle";
import ConfirmDialog from "@/components/ConfirmDialog";

interface SlotPlayerManagerProps {
  players: SlotPlayer[];
  activePlayerId: string | null;
  onSelectPlayer: (id: string) => void;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onUpdatePlayer: (
    id: string,
    patch: { name?: string; balance?: number; defaultBet?: number }
  ) => void;
  isLightMode: boolean;
}

export default function SlotPlayerManager({
  players,
  activePlayerId,
  onSelectPlayer,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayer,
  isLightMode,
}: SlotPlayerManagerProps) {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState(0);
  const [editBet, setEditBet] = useState(3);

  const { glassBg, glassBorder } = useGlassStyle(isLightMode);
  const textPrimary = isLightMode ? "text-gray-800" : "text-white/95";
  const textSecondary = isLightMode ? "text-gray-600" : "text-white/70";
  const textMuted = isLightMode ? "text-gray-500" : "text-white/60";
  const inputBg = isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
  const inputBorder = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    onAddPlayer(newPlayerName.trim());
    setNewPlayerName("");
  };

  const startEdit = (p: SlotPlayer) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditBalance(p.balance);
    setEditBet(p.defaultBet);
  };

  const saveEdit = () => {
    if (!editingId) return;
    onUpdatePlayer(editingId, {
      name: editName.trim() || undefined,
      balance: Math.max(0, editBalance),
      defaultBet: Math.max(1, editBet),
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const canRemove = players.length > 1;

  return (
    <div className="flex flex-col gap-3 pr-1 pb-4">
      <div
        className="rounded-2xl p-4"
        style={{
          background: glassBg,
          border: `1px solid ${glassBorder}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <label
          className={`text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-2 block`}
        >
          プレイヤー追加
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="名前を入力..."
            className={`flex-1 px-3 py-2 rounded-lg text-sm ${textPrimary} outline-none transition-all focus:ring-2 focus:ring-teal-500/30 ${
              isLightMode ? "placeholder:text-gray-500" : "placeholder:text-white/55"
            }`}
            style={{
              background: inputBg,
              border: `1px solid ${inputBorder}`,
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
          />
          <button
            type="button"
            onClick={handleAddPlayer}
            disabled={!newPlayerName.trim()}
            className={`p-2 rounded-lg transition-all disabled:opacity-30 ${
              isLightMode
                ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
                : "bg-teal-500/20 text-teal-400 hover:bg-teal-500/30"
            }`}
            aria-label="追加"
          >
            <UserPlus size={16} />
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: glassBg,
          border: `1px solid ${glassBorder}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className={`flex items-center justify-between gap-2 px-4 py-2.5 border-b ${textSecondary}`}
          style={{ borderColor: glassBorder }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider">
            プレイヤー ({players.length})
          </span>
        </div>

        {players.length === 0 ? (
          <div className="p-4 text-center">
            <p className={`text-sm ${textMuted}`}>プレイヤーを追加してください</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {players.map((player) => {
              const isActive = player.id === activePlayerId;
              const isEditing = editingId === player.id;

              return (
                <motion.div
                  key={player.id}
                  layout
                  className={`flex flex-col gap-2 px-4 py-3 border-b transition-all ${
                    isActive
                      ? isLightMode
                        ? "bg-teal-50"
                        : "bg-teal-500/10"
                      : isLightMode
                        ? "hover:bg-gray-50"
                        : "hover:bg-white/5"
                  }`}
                  style={{ borderColor: glassBorder }}
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => !isEditing && onSelectPlayer(player.id)}
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isActive
                          ? "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]"
                          : isLightMode
                            ? "bg-gray-300"
                            : "bg-white/20"
                      }`}
                    />
                    {isEditing ? (
                      <div className="flex-1 min-w-0 flex flex-col gap-2 py-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={`w-full px-2 py-1.5 rounded text-sm ${textPrimary}`}
                          style={{
                            background: inputBg,
                            border: `1px solid ${inputBorder}`,
                          }}
                          placeholder="名前"
                        />
                        <div className="flex gap-2 items-center">
                          <label className={`text-xs ${textMuted}`}>残高</label>
                          <input
                            type="number"
                            min={0}
                            value={editBalance}
                            onChange={(e) =>
                              setEditBalance(parseInt(e.target.value, 10) || 0)
                            }
                            className={`w-20 px-2 py-1 rounded text-sm ${textPrimary}`}
                            style={{
                              background: inputBg,
                              border: `1px solid ${inputBorder}`,
                            }}
                          />
                          <label className={`text-xs ${textMuted}`}>BET</label>
                          <input
                            type="number"
                            min={1}
                            value={editBet}
                            onChange={(e) =>
                              setEditBet(parseInt(e.target.value, 10) || 1)
                            }
                            className={`w-16 px-2 py-1 rounded text-sm ${textPrimary}`}
                            style={{
                              background: inputBg,
                              border: `1px solid ${inputBorder}`,
                            }}
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={saveEdit}
                            className={`p-1.5 rounded-lg text-xs font-medium ${
                              isLightMode
                                ? "bg-teal-100 text-teal-700"
                                : "bg-teal-500/20 text-teal-400"
                            }`}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className={`p-1.5 rounded-lg text-xs ${
                              isLightMode
                                ? "text-gray-600 hover:bg-gray-100"
                                : "text-white/70 hover:bg-white/10"
                            }`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${textPrimary}`}>
                            {player.name}
                          </p>
                          <p className={`text-xs ${textMuted}`}>
                            残高 {player.balance} 枚 · BET {player.defaultBet} 枚
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(player);
                            }}
                            className={`p-1.5 rounded-lg transition-all ${
                              isLightMode
                                ? "text-teal-700 hover:bg-teal-50"
                                : "text-teal-400 hover:bg-teal-500/10"
                            }`}
                            title="編集"
                            aria-label="編集"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canRemove) setPlayerToDelete(player.id);
                            }}
                            disabled={!canRemove}
                            className={`p-1.5 rounded-lg transition-all disabled:opacity-30 ${
                              isLightMode
                                ? "text-gray-600 hover:bg-gray-100"
                                : "text-white/70 hover:bg-white/10"
                            }`}
                            title={
                              canRemove
                                ? "削除"
                                : "最後の1人のため削除できません"
                            }
                            aria-label="削除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={playerToDelete !== null}
        message="本当に削除しますか？"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={() => {
          if (playerToDelete) {
            onRemovePlayer(playerToDelete);
            setPlayerToDelete(null);
          }
        }}
        onCancel={() => setPlayerToDelete(null)}
      />
    </div>
  );
}
