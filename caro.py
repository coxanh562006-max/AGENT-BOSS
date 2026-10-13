#!/usr/bin/env python3
"""Cờ Caro - phần mềm chơi cờ caro (gomoku) trên máy tính.

Chạy: python caro.py
Yêu cầu: Python 3.8+ có sẵn Tkinter (mặc định trên Windows/macOS;
trên Ubuntu/Debian cài thêm: sudo apt install python3-tk).
"""

import random
import tkinter as tk
from tkinter import messagebox

BOARD_SIZE = 15
CELL = 36
MARGIN = 24
WIN_LEN = 5

EMPTY, X, O = 0, 1, 2
SYMBOL = {X: "X", O: "O"}
COLOR = {X: "#d6336c", O: "#1c7ed6"}
DIRECTIONS = ((1, 0), (0, 1), (1, 1), (1, -1))

# Điểm cho một chuỗi theo (độ dài, số đầu mở)
PATTERN_SCORE = {
    (5, 0): 10_000_000, (5, 1): 10_000_000, (5, 2): 10_000_000,
    (4, 2): 1_000_000, (4, 1): 50_000,
    (3, 2): 40_000, (3, 1): 1_500,
    (2, 2): 1_200, (2, 1): 150,
    (1, 2): 30, (1, 1): 5,
}


class Game:
    def __init__(self, size=BOARD_SIZE):
        self.size = size
        self.reset()

    def reset(self):
        self.board = [[EMPTY] * self.size for _ in range(self.size)]
        self.history = []
        self.turn = X
        self.winner = None
        self.win_line = []

    def inside(self, r, c):
        return 0 <= r < self.size and 0 <= c < self.size

    def play(self, r, c):
        if self.winner or not self.inside(r, c) or self.board[r][c] != EMPTY:
            return False
        self.board[r][c] = self.turn
        self.history.append((r, c))
        line = self.check_win(r, c)
        if line:
            self.winner = self.turn
            self.win_line = line
        elif len(self.history) == self.size * self.size:
            self.winner = "draw"
        else:
            self.turn = O if self.turn == X else X
        return True

    def undo(self):
        if not self.history:
            return False
        r, c = self.history.pop()
        player = self.board[r][c]
        self.board[r][c] = EMPTY
        self.turn = player
        self.winner = None
        self.win_line = []
        return True

    def check_win(self, r, c):
        p = self.board[r][c]
        for dr, dc in DIRECTIONS:
            line = [(r, c)]
            for sign in (1, -1):
                nr, nc = r + dr * sign, c + dc * sign
                while self.inside(nr, nc) and self.board[nr][nc] == p:
                    line.append((nr, nc))
                    nr, nc = nr + dr * sign, nc + dc * sign
            if len(line) >= WIN_LEN:
                return sorted(line)
        return None


class AI:
    """Máy đánh theo heuristic: chấm điểm tấn công + phòng thủ cho từng ô."""

    def __init__(self, game):
        self.game = game

    def line_info(self, r, c, dr, dc, p):
        """Độ dài chuỗi và số đầu mở nếu đặt quân p vào (r, c)."""
        b, g = self.game.board, self.game
        count, open_ends = 1, 0
        for sign in (1, -1):
            nr, nc = r + dr * sign, c + dc * sign
            while g.inside(nr, nc) and b[nr][nc] == p:
                count += 1
                nr, nc = nr + dr * sign, nc + dc * sign
            if g.inside(nr, nc) and b[nr][nc] == EMPTY:
                open_ends += 1
        return min(count, 5), open_ends

    def cell_score(self, r, c, p):
        total, strong = 0, 0
        for dr, dc in DIRECTIONS:
            length, ends = self.line_info(r, c, dr, dc, p)
            if length < 5 and ends == 0:
                continue
            s = PATTERN_SCORE.get((length, ends), 0)
            total += s
            if s >= 40_000:
                strong += 1
        if strong >= 2:  # tạo được hai đường nguy hiểm cùng lúc
            total += 500_000
        return total

    def candidates(self):
        g = self.game
        cells = set()
        for r, c in g.history:
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    nr, nc = r + dr, c + dc
                    if g.inside(nr, nc) and g.board[nr][nc] == EMPTY:
                        cells.add((nr, nc))
        return cells

    def best_move(self):
        g = self.game
        if not g.history:
            mid = g.size // 2
            return mid, mid
        me = g.turn
        opp = X if me == O else O
        best, best_score = None, -1
        for r, c in self.candidates():
            attack = self.cell_score(r, c, me)
            defend = self.cell_score(r, c, opp)
            score = attack * 1.1 + defend + random.random()
            if score > best_score:
                best, best_score = (r, c), score
        return best


class CaroApp:
    def __init__(self, root):
        self.root = root
        self.game = Game()
        self.ai = AI(self.game)
        self.mode = tk.StringVar(value="ai")
        self.human_first = tk.BooleanVar(value=True)
        self.score = {X: 0, O: 0, "draw": 0}
        self.hover = None

        root.title("Cờ Caro")
        root.resizable(False, False)
        root.configure(bg="#f1f3f5")

        self.build_menu()
        self.build_toolbar()

        size_px = MARGIN * 2 + CELL * BOARD_SIZE
        self.canvas = tk.Canvas(root, width=size_px, height=size_px,
                                bg="#f8e7c1", highlightthickness=0)
        self.canvas.pack(padx=12, pady=(0, 6))
        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<Motion>", self.on_motion)
        self.canvas.bind("<Leave>", lambda e: self.set_hover(None))

        self.status = tk.Label(root, font=("Segoe UI", 12, "bold"),
                               bg="#f1f3f5", anchor="w")
        self.status.pack(fill="x", padx=14)
        self.score_label = tk.Label(root, font=("Segoe UI", 10),
                                    bg="#f1f3f5", fg="#495057", anchor="w")
        self.score_label.pack(fill="x", padx=14, pady=(0, 10))

        root.bind("<Control-z>", lambda e: self.undo())
        root.bind("<F2>", lambda e: self.new_game())

        self.new_game()

    # ---------- giao diện ----------
    def build_menu(self):
        menubar = tk.Menu(self.root)
        game_menu = tk.Menu(menubar, tearoff=0)
        game_menu.add_command(label="Ván mới", accelerator="F2", command=self.new_game)
        game_menu.add_command(label="Đi lại", accelerator="Ctrl+Z", command=self.undo)
        game_menu.add_separator()
        game_menu.add_radiobutton(label="Chơi với máy", variable=self.mode,
                                  value="ai", command=self.new_game)
        game_menu.add_radiobutton(label="Hai người chơi", variable=self.mode,
                                  value="pvp", command=self.new_game)
        game_menu.add_checkbutton(label="Người đi trước (X)", variable=self.human_first,
                                  command=self.new_game)
        game_menu.add_separator()
        game_menu.add_command(label="Thoát", command=self.root.destroy)
        menubar.add_cascade(label="Trò chơi", menu=game_menu)

        help_menu = tk.Menu(menubar, tearoff=0)
        help_menu.add_command(label="Luật chơi", command=self.show_rules)
        menubar.add_cascade(label="Trợ giúp", menu=help_menu)
        self.root.config(menu=menubar)

    def build_toolbar(self):
        bar = tk.Frame(self.root, bg="#f1f3f5")
        bar.pack(fill="x", padx=12, pady=8)
        btn = dict(font=("Segoe UI", 10), relief="flat", bg="#dee2e6",
                   activebackground="#ced4da", padx=10, pady=3, cursor="hand2")
        tk.Button(bar, text="Ván mới", command=self.new_game, **btn).pack(side="left")
        tk.Button(bar, text="Đi lại", command=self.undo, **btn).pack(side="left", padx=6)
        tk.Radiobutton(bar, text="Chơi với máy", variable=self.mode, value="ai",
                       command=self.new_game, bg="#f1f3f5").pack(side="left", padx=(12, 0))
        tk.Radiobutton(bar, text="2 người", variable=self.mode, value="pvp",
                       command=self.new_game, bg="#f1f3f5").pack(side="left")
        tk.Checkbutton(bar, text="Tôi đi trước", variable=self.human_first,
                       command=self.new_game, bg="#f1f3f5").pack(side="left", padx=(12, 0))

    def show_rules(self):
        messagebox.showinfo(
            "Luật chơi",
            "Hai bên lần lượt đặt X và O lên bàn cờ.\n"
            f"Ai xếp được {WIN_LEN} quân liên tiếp theo hàng ngang, dọc "
            "hoặc chéo trước là thắng.\n\n"
            "F2: ván mới   •   Ctrl+Z: đi lại")

    def cell_center(self, r, c):
        return MARGIN + c * CELL + CELL / 2, MARGIN + r * CELL + CELL / 2

    def draw(self):
        cv = self.canvas
        cv.delete("all")
        end = MARGIN + CELL * BOARD_SIZE
        for i in range(BOARD_SIZE + 1):
            p = MARGIN + i * CELL
            cv.create_line(MARGIN, p, end, p, fill="#c9a66b")
            cv.create_line(p, MARGIN, p, end, fill="#c9a66b")
        win = set(self.game.win_line)
        last = self.game.history[-1] if self.game.history else None
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                v = self.game.board[r][c]
                x0, y0 = MARGIN + c * CELL, MARGIN + r * CELL
                if (r, c) in win:
                    cv.create_rectangle(x0 + 1, y0 + 1, x0 + CELL - 1, y0 + CELL - 1,
                                        fill="#ffe066", outline="")
                elif (r, c) == last:
                    cv.create_rectangle(x0 + 1, y0 + 1, x0 + CELL - 1, y0 + CELL - 1,
                                        fill="#f3d99a", outline="")
                if v:
                    self.draw_piece(r, c, v)
        if self.hover and not self.game.winner and self.human_turn():
            r, c = self.hover
            if self.game.board[r][c] == EMPTY:
                self.draw_piece(r, c, self.game.turn, ghost=True)

    def draw_piece(self, r, c, p, ghost=False):
        cx, cy = self.cell_center(r, c)
        k = CELL * 0.3
        color = "#adb5bd" if ghost else COLOR[p]
        w = 2 if ghost else 4
        if p == X:
            self.canvas.create_line(cx - k, cy - k, cx + k, cy + k, fill=color, width=w,
                                    capstyle="round")
            self.canvas.create_line(cx - k, cy + k, cx + k, cy - k, fill=color, width=w,
                                    capstyle="round")
        else:
            self.canvas.create_oval(cx - k, cy - k, cx + k, cy + k, outline=color, width=w)

    def update_status(self):
        g = self.game
        if g.winner == "draw":
            text, color = "Hòa!", "#495057"
        elif g.winner:
            text, color = f"{self.player_name(g.winner)} thắng!", COLOR[g.winner]
        else:
            text, color = f"Lượt: {self.player_name(g.turn)}", COLOR[g.turn]
        self.status.config(text=text, fg=color)
        if self.mode.get() == "ai":
            human = X if self.human_first.get() else O
            ai = O if human == X else X
            self.score_label.config(
                text=f"Bạn {self.score[human]} – {self.score[ai]} Máy   •   Hòa {self.score['draw']}")
        else:
            self.score_label.config(
                text=f"X {self.score[X]} – {self.score[O]} O   •   Hòa {self.score['draw']}")

    def player_name(self, p):
        if self.mode.get() == "pvp":
            return f"Người chơi {SYMBOL[p]}"
        human = X if self.human_first.get() else O
        return f"Bạn ({SYMBOL[p]})" if p == human else f"Máy ({SYMBOL[p]})"

    # ---------- điều khiển ----------
    def human_turn(self):
        if self.mode.get() == "pvp":
            return True
        human = X if self.human_first.get() else O
        return self.game.turn == human

    def new_game(self):
        self.game.reset()
        self.refresh()
        if self.mode.get() == "ai" and not self.human_turn():
            self.root.after(300, self.ai_move)

    def undo(self):
        if self.mode.get() == "ai":
            # lùi cả nước của máy và của người
            self.game.undo()
            while self.game.history and not self.human_turn():
                self.game.undo()
            if not self.game.history and not self.human_turn():
                self.root.after(300, self.ai_move)
        else:
            self.game.undo()
        self.refresh()

    def refresh(self):
        self.draw()
        self.update_status()

    def set_hover(self, cell):
        if cell != self.hover:
            self.hover = cell
            self.draw()

    def event_cell(self, event):
        c = int((event.x - MARGIN) // CELL)
        r = int((event.y - MARGIN) // CELL)
        if self.game.inside(r, c) and event.x >= MARGIN and event.y >= MARGIN:
            return r, c
        return None

    def on_motion(self, event):
        self.set_hover(self.event_cell(event))

    def on_click(self, event):
        cell = self.event_cell(event)
        if not cell or not self.human_turn():
            return
        if self.game.play(*cell):
            self.after_move()
            if self.mode.get() == "ai" and not self.game.winner:
                self.root.after(250, self.ai_move)

    def ai_move(self):
        if self.game.winner or self.human_turn():
            return
        move = self.ai.best_move()
        if move and self.game.play(*move):
            self.after_move()

    def after_move(self):
        self.refresh()
        w = self.game.winner
        if w:
            self.score[w] += 1
            self.update_status()
            msg = "Hòa!" if w == "draw" else f"{self.player_name(w)} thắng!"
            self.root.after(100, lambda: messagebox.showinfo("Kết thúc ván", msg))


def main():
    root = tk.Tk()
    CaroApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
