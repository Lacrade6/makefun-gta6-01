// Save and load: progress lives in the browser's localStorage so the
// title screen can offer CONTINUE. Only progress is stored — cash, REP,
// missions finished, and whether the story is done. Nothing sensitive.

const KEY = 'solmar-city-save-v4';

export class Save {
  constructor(game) {
    this.game = game;
  }

  save() {
    try {
      const data = {
        version: 4,
        cash: this.game.player.cash,
        rep: this.game.rep,
        missionsCompleted: this.game.missions.completed,
        storyComplete: this.game.storyComplete,
        health: this.game.player.health,
      };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Private mode or a full store: the game still plays, it just
      // cannot remember. Nothing here is worth an error screen.
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data.missionsCompleted !== 'number') return null;
      return data;
    } catch {
      return null;
    }
  }

  apply(data) {
    this.game.player.cash = data.cash || 0;
    this.game.rep = data.rep || 0;
    this.game.repLevel = 1 + Math.floor(this.game.rep / 220);
    this.game.missions.completed = data.missionsCompleted || 0;
    this.game.storyComplete = !!data.storyComplete;
    this.game.player.health = data.health || 100;
  }

  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
