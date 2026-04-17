import pygame
import sys
import math
import random
import threading
import time

pygame.init()

W, H = 1280, 720
screen = pygame.display.set_mode((W, H))
pygame.display.set_caption("GesturePlay")
clock = pygame.time.Clock()

FONT_HUGE  = pygame.font.SysFont("Georgia", 100, bold=True)
FONT_BIG   = pygame.font.SysFont("Georgia", 64, bold=True)
FONT_MED   = pygame.font.SysFont("Georgia", 36)
FONT_SM    = pygame.font.SysFont("Georgia", 26)
FONT_XS    = pygame.font.SysFont("Georgia", 20)

BG        = (15, 12, 25)
LANE_DARK = (30, 22, 10)
LANE_LINE = (180, 130, 50)
PIN_COL   = (240, 235, 220)
PIN_RED   = (200, 40, 40)
BALL_COL  = (30, 30, 80)
BALL_SHN  = (80, 80, 160)
WHITE     = (255, 255, 255)
GOLD      = (255, 200, 50)
ACCENT    = (100, 180, 255)
GREEN     = (60, 200, 100)
RED       = (220, 60, 60)
GRAY      = (120, 120, 130)
DARK_GRAY = (40, 38, 50)
ORANGE    = (255, 140, 0)

GESTURE_AVAILABLE = False
GESTURE_ERROR     = ""

try:
    import cv2
    import mediapipe as mp
    import numpy as np
    GESTURE_AVAILABLE = True
    print("[INFO] OpenCV + MediaPipe loaded OK")
except ImportError as e:
    GESTURE_ERROR = str(e)
    print(f"[ERROR] Import failed: {e}")

gesture_lock = threading.Lock()
gesture_data = {
    "swing_detected":  False,
    "power":           0.8,
    "wrist_y":         0.5,
    "swing_triggered": False,
    "running":         True,
    "cam_ok":          False,   # True once webcam opens
    "pose_ok":         False,   # True once a pose is detected
    "cam_error":       "",      # error message if cam fails
    "frame_count":     0,
}

def gesture_thread_fn():
    print("[CAM] Thread started, trying to open webcam index 0 ...")

    # ── Try multiple camera indices ───────────────────────────────────────────
    cap = None
    for idx in [0, 1, 2]:
        c = cv2.VideoCapture(idx)
        time.sleep(1)    # CAP_DSHOW = faster on Windows
        if c.isOpened():
            ret, test_frame = c.read()
            if ret and test_frame is not None:
                cap = c
                print(f"[CAM] Opened successfully on index {idx}")
                break
            c.release()
        print(f"[CAM] Index {idx} not available")

    if cap is None:
        msg = "No webcam found on indices 0-2. Check device manager."
        print(f"[CAM ERROR] {msg}")
        with gesture_lock:
            gesture_data["cam_error"] = msg
        return

    # ── Set resolution ────────────────────────────────────────────────────────
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    with gesture_lock:
        gesture_data["cam_ok"] = True

    mp_pose = mp.solutions.pose
    mp_draw  = mp.solutions.drawing_utils
    pose     = mp_pose.Pose(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

    print("[CAM] Starting frame loop ...")

    while True:
        with gesture_lock:
            if not gesture_data["running"]:
                break

        ret, frame = cap.read()
        if not ret or frame is None:
            print("[CAM] Failed to read frame, retrying ...")
            time.sleep(0.05)
            continue

        with gesture_lock:
            gesture_data["frame_count"] += 1

        frame = cv2.flip(frame, 1)
        rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = pose.process(rgb)

        if result.pose_landmarks:
            lm = result.pose_landmarks.landmark

            wrist_y    = lm[16].y   # right wrist
            shoulder_y = lm[12].y   # right shoulder

            with gesture_lock:
                gesture_data["pose_ok"] = True
                prev_y = gesture_data["wrist_y"]
                delta  = wrist_y - prev_y
                speed  = abs(delta)

                if (delta > 0.04
                        and wrist_y > shoulder_y + 0.05
                        and not gesture_data["swing_triggered"]):
                    gesture_data["swing_detected"]  = True
                    gesture_data["power"]           = min(speed * 20, 1.0)
                    gesture_data["swing_triggered"] = True
                    print(f"[GESTURE] SWING detected! power={gesture_data['power']:.2f}")

                if delta < -0.02:
                    gesture_data["swing_triggered"] = False

                gesture_data["wrist_y"] = wrist_y

            mp_draw.draw_landmarks(frame, result.pose_landmarks,
                                   mp_pose.POSE_CONNECTIONS)
            cv2.putText(frame, "POSE DETECTED", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        else:
            cv2.putText(frame, "NO POSE - move back / improve lighting",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            with gesture_lock:
                gesture_data["pose_ok"] = False

        with gesture_lock:
            fc = gesture_data["frame_count"]
        cv2.putText(frame, f"Frames: {fc}", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        cv2.imshow("Gesture Cam  [Q to quit cam]", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("[CAM] Thread ended cleanly")


if GESTURE_AVAILABLE:
    t = threading.Thread(target=gesture_thread_fn, daemon=True)
    t.start()
else:
    print(f"[WARN] Gesture not available: {GESTURE_ERROR}")


# ── Helper draw functions ──────────────────────────────────────────────────────

def txt_c(surf, text, font, color, y):
    s = font.render(text, True, color)
    surf.blit(s, (W//2 - s.get_width()//2, y))

def txt(surf, text, font, color, x, y):
    surf.blit(font.render(text, True, color), (x, y))

def draw_btn(surf, label, rect, hover=False):
    bg  = (55, 50, 80) if hover else (30, 27, 48)
    bdr = GOLD if hover else ACCENT
    pygame.draw.rect(surf, bg,  rect, border_radius=12)
    pygame.draw.rect(surf, bdr, rect, 2, border_radius=12)
    s = FONT_MED.render(label, True, WHITE)
    surf.blit(s, (rect[0] + rect[2]//2 - s.get_width()//2,
                  rect[1] + rect[3]//2 - s.get_height()//2))

def stars(surf, t):
    random.seed(99)
    for _ in range(140):
        x = random.randint(0, W)
        y = random.randint(0, H)
        b = int(120 + 80 * math.sin(t * 0.7 + x * 0.05))
        pygame.draw.circle(surf, (b, b, b), (x, y), random.randint(1, 2))


# ── Game objects ───────────────────────────────────────────────────────────────

class Pin:
    def __init__(self, x, y):
        self.ox=x; self.oy=y
        self.x=float(x); self.y=float(y)
        self.vx=0.0; self.vy=0.0
        self.up=True; self.fa=0.0; self.fs=0.0; self.r=13

    def knock(self, bvx, bvy, power):
        if not self.up: return
        self.up=False
        self.vx=bvx*0.55+random.uniform(-0.4,0.4)*power*7
        self.vy=bvy*0.45+random.uniform(-2,2)
        self.fs=random.uniform(3,6)*power

    def update(self):
        if not self.up:
            self.x+=self.vx; self.y+=self.vy
            self.fa+=self.fs; self.vx*=0.95; self.vy*=0.95

    def draw(self, surf):
        if not self.up:
            a=math.radians(self.fa); cx=int(self.x); cy=int(self.y)
            pts=[]
            for d in range(0,360,20):
                dr=math.radians(d)
                px=cx+math.cos(dr)*7*math.cos(a)-math.sin(dr)*16*math.sin(a)
                py=cy+math.cos(dr)*7*math.sin(a)+math.sin(dr)*16*math.cos(a)
                pts.append((int(px),int(py)))
            if len(pts)>=3: pygame.draw.polygon(surf,GRAY,pts)
            return
        cx=int(self.x); cy=int(self.y)
        pygame.draw.ellipse(surf,PIN_COL,(cx-7,cy-20,14,30))
        pygame.draw.rect(surf,PIN_RED,(cx-7,cy-4,14,5))
        pygame.draw.circle(surf,PIN_COL,(cx,cy-20),8)
        pygame.draw.ellipse(surf,(20,15,5),(cx-9,cy+8,18,5))

    def reset(self):
        self.x=float(self.ox); self.y=float(self.oy)
        self.vx=0; self.vy=0; self.up=True; self.fa=0; self.fs=0


class Ball:
    def __init__(self, x, y):
        self.ox=x; self.oy=y
        self.x=float(x); self.y=float(y)
        self.vx=0.0; self.vy=0.0
        self.rolling=False; self.angle=0.0; self.r=20

    def throw(self, power):
        self.rolling=True
        self.vx=random.uniform(-0.6,0.6)
        self.vy=-(16+power*12)

    def update(self, pins, lx, lw, lt):
        if not self.rolling: return False
        self.x+=self.vx; self.y+=self.vy; self.angle+=5
        if self.x<lx+self.r: self.x=lx+self.r; self.vx=abs(self.vx)
        if self.x>lx+lw-self.r: self.x=lx+lw-self.r; self.vx=-abs(self.vx)
        for p in pins:
            if p.up and math.hypot(self.x-p.x,self.y-p.y)<self.r+p.r:
                p.knock(self.vx,self.vy,1.0)
        return self.y < lt-40

    def draw(self, surf):
        cx=int(self.x); cy=int(self.y)
        pygame.draw.circle(surf,BALL_COL,(cx,cy),self.r)
        pygame.draw.circle(surf,BALL_SHN,(cx-5,cy-5),6)
        a=math.radians(self.angle)
        for ha in [0,2.1,4.2]:
            hx=cx+int(math.cos(a+ha)*8); hy=cy+int(math.sin(a+ha)*8)
            pygame.draw.circle(surf,(10,10,40),(hx,hy),3)
        pygame.draw.ellipse(surf,(10,8,3),(cx-16,cy+16,32,8))

    def reset(self):
        self.x=float(self.ox); self.y=float(self.oy)
        self.vx=0; self.vy=0; self.rolling=False; self.angle=0


def draw_lane(surf, lx, lw, lt, lb):
    pygame.draw.rect(surf,LANE_DARK,(lx,lt,lw,lb-lt))
    for i in range(9):
        pygame.draw.line(surf,LANE_LINE,(lx+i*(lw//8),lt),(lx+i*(lw//8),lb),1)
    mid=lx+lw//2
    for dx in [-70,-35,0,35,70]:
        ax=mid+dx; ay=lb-90
        pygame.draw.polygon(surf,LANE_LINE,[(ax,ay-12),(ax-7,ay+5),(ax+7,ay+5)])
    pygame.draw.line(surf,RED,(lx,lb-40),(lx+lw,lb-40),3)
    pygame.draw.rect(surf,(8,6,2),(lx-28,lt,28,lb-lt))
    pygame.draw.rect(surf,(8,6,2),(lx+lw,lt,28,lb-lt))

def make_pins(lx,lw,lt):
    mid=lx+lw//2; base=lt+80; sp=34; pins=[]
    for dx,dy in [
        (-sp*1.5,0),(-sp*.5,0),(sp*.5,0),(sp*1.5,0),
        (-sp,sp*.87),(0,sp*.87),(sp,sp*.87),
        (-sp*.5,sp*1.74),(sp*.5,sp*1.74),
        (0,sp*2.6)]:
        pins.append(Pin(mid+dx,base+dy))
    return pins


# ── Game state machine ─────────────────────────────────────────────────────────

S_MENU="menu"; S_INTRO="intro"; S_COUNT="count"
S_PLAY="play"; S_RES="result"; S_OVER="over"
LX=W//2-160; LW=320; LT=40; LB=H-20

class Game:
    def __init__(self): self.reset()

    def reset(self):
        self.pins=make_pins(LX,LW,LT)
        self.ball=Ball(LX+LW//2, LB-60)
        self.score=0; self.balls=3; self.state=S_MENU
        self.t=0.0; self.cd=3; self.cd_t=0.0
        self.go_t=-1.0; self.res_t=0.0
        self.knocked=0; self.total_k=0
        self.btn_bowling  =pygame.Rect(W//2-330,H//2+50,200,65)
        self.btn_badminton=pygame.Rect(W//2-80, H//2+50,200,65)
        self.btn_shooter  =pygame.Rect(W//2+170,H//2+50,200,65)
        self.btn_start    =pygame.Rect(W//2-120,H//2+140,240,65)
        self.btn_again    =pygame.Rect(W//2-110,H//2+110,220,60)

    def round_reset(self):
        for p in self.pins: p.reset()
        self.ball.reset(); self.knocked=0

    def count_knocked(self): return sum(1 for p in self.pins if not p.up)

    def update(self, dt):
        self.t+=dt
        if self.state==S_COUNT:
            self.cd_t+=dt
            if self.cd_t>=1.0:
                self.cd_t=0; self.cd-=1
                if self.cd<0: self.state=S_PLAY; self.go_t=0.0
        elif self.state==S_PLAY:
            if self.go_t>=0: self.go_t+=dt
            for p in self.pins: p.update()
            if self.ball.rolling:
                done=self.ball.update(self.pins,LX,LW,LT)
                if done:
                    self.knocked=self.count_knocked()
                    self.total_k+=self.knocked
                    self.score+=self.knocked*10
                    self.balls-=1; self.res_t=0.0; self.state=S_RES
            with gesture_lock:
                if gesture_data["swing_detected"] and not self.ball.rolling:
                    self.ball.throw(gesture_data["power"])
                    gesture_data["swing_detected"]=False
        elif self.state==S_RES:
            self.res_t+=dt
            if self.res_t>2.5:
                if self.balls<=0: self.state=S_OVER
                else: self.round_reset(); self.state=S_PLAY

    def on_key(self, key):
        if self.state==S_PLAY and key==pygame.K_s and not self.ball.rolling:
            self.ball.throw(0.8)
        if self.state==S_OVER and key==pygame.K_r:
            self.reset()

    def on_click(self, pos):
        if self.state==S_MENU:
            if self.btn_bowling.collidepoint(pos):
                self.state=S_INTRO
        elif self.state==S_INTRO:
            if self.btn_start.collidepoint(pos):
                self.state=S_COUNT; self.cd=3; self.cd_t=0
        elif self.state==S_OVER:
            if self.btn_again.collidepoint(pos):
                self.reset()

    def draw(self, surf):
        surf.fill(BG)
        stars(surf,self.t)
        mx,my=pygame.mouse.get_pos()
        if   self.state==S_MENU:  self._menu(surf,mx,my)
        elif self.state==S_INTRO: self._intro(surf,mx,my)
        elif self.state==S_COUNT: self._game_base(surf); self._countdown(surf)
        elif self.state==S_PLAY:  self._game_base(surf); self._hud(surf); self._go(surf)
        elif self.state==S_RES:   self._game_base(surf); self._hud(surf); self._result(surf)
        elif self.state==S_OVER:  self._game_base(surf); self._gameover(surf,mx,my)
        self._cam_status(surf)

    def _cam_status(self, surf):
        with gesture_lock:
            cam_ok   = gesture_data["cam_ok"]
            pose_ok  = gesture_data["pose_ok"]
            cam_err  = gesture_data["cam_error"]
            frames   = gesture_data["frame_count"]

        if cam_err:
            s = FONT_XS.render(f"CAM ERROR: {cam_err}", True, RED)
            surf.blit(s, (W - s.get_width() - 10, H - 30))
        elif not GESTURE_AVAILABLE:
            s = FONT_XS.render(f"MediaPipe missing: {GESTURE_ERROR}", True, ORANGE)
            surf.blit(s, (W - s.get_width() - 10, H - 30))
        elif not cam_ok:
            s = FONT_XS.render("Opening webcam...", True, ORANGE)
            surf.blit(s, (W - s.get_width() - 10, H - 30))
        else:
            pose_col = GREEN if pose_ok else ORANGE
            pose_txt = "Pose: detected" if pose_ok else "Pose: not found - step back"
            s = FONT_XS.render(f"CAM OK  |  {pose_txt}  |  frames: {frames}", True, pose_col)
            surf.blit(s, (W - s.get_width() - 10, H - 30))

    def _menu(self,surf,mx,my):
        p=1.0+0.03*math.sin(self.t*2)
        ts=FONT_HUGE.render("GesturePlay",True,GOLD)
        sw=int(ts.get_width()*p); sh=int(ts.get_height()*p)
        ts=pygame.transform.scale(ts,(sw,sh))
        surf.blit(ts,(W//2-sw//2,80))
        txt_c(surf,"Lets Play!",FONT_MED,WHITE,230)
        txt_c(surf,"Choose a game below",FONT_XS,GRAY,275)
        draw_btn(surf,"Bowling",  self.btn_bowling,  self.btn_bowling.collidepoint(mx,my))
        draw_btn(surf,"Badminton",self.btn_badminton,False)
        draw_btn(surf,"Shooter",  self.btn_shooter,  False)
        for b in [self.btn_badminton,self.btn_shooter]:
            s=FONT_XS.render("coming soon",True,GRAY)
            surf.blit(s,(b.x+b.w//2-s.get_width()//2,b.y+b.h+6))

    def _intro(self,surf,mx,my):
        panel=pygame.Rect(W//2-300,H//2-220,600,440)
        pygame.draw.rect(surf,DARK_GRAY,panel,border_radius=18)
        pygame.draw.rect(surf,GOLD,panel,2,border_radius=18)
        txt_c(surf,"BOWLING",FONT_BIG,GOLD,H//2-200)
        for i,line in enumerate([
            "Stand in front of your webcam",
            "Full upper body must be visible",
            "Swing your RIGHT ARM downward to throw",
            "Press  S  key as manual fallback",
            "",
            "3 balls per round   |   10 points per pin",
        ]):
            txt_c(surf,line,FONT_SM,ACCENT if i==5 else WHITE,H//2-110+i*36)
        draw_btn(surf,"GET STARTED",self.btn_start,self.btn_start.collidepoint(mx,my))

    def _game_base(self,surf=None):
        s=surf if surf else screen
        draw_lane(s,LX,LW,LT,LB)
        for p in self.pins: p.draw(s)
        self.ball.draw(s)

    def _countdown(self,surf):
        label=str(self.cd) if self.cd>0 else "GO!"
        color=GREEN if self.cd<=0 else GOLD
        scale=1.0+0.4*(1.0-min(self.cd_t,1.0))
        ts=FONT_HUGE.render(label,True,color)
        sw=int(ts.get_width()*scale); sh=int(ts.get_height()*scale)
        ts=pygame.transform.scale(ts,(sw,sh))
        surf.blit(ts,(W//2-sw//2,H//2-sh//2))

    def _hud(self,surf):
        panel=pygame.Rect(18,18,210,110)
        pygame.draw.rect(surf,DARK_GRAY,panel,border_radius=10)
        pygame.draw.rect(surf,ACCENT,panel,2,border_radius=10)
        txt(surf,"SCORE",FONT_XS,ACCENT,32,28)
        txt(surf,str(self.score),FONT_BIG,GOLD,32,48)
        txt(surf,f"Balls left: {self.balls}",FONT_XS,GRAY,32,112)
        txt(surf,f"Pins down: {self.count_knocked()}",FONT_SM,GREEN,W-200,28)
        if not self.ball.rolling:
            h=FONT_XS.render("Swing arm to throw  |  S = manual",True,GRAY)
            surf.blit(h,(W//2-h.get_width()//2,H-50))

    def _go(self,surf):
        if 0<=self.go_t<1.2:
            a=max(0.0,1.0-self.go_t/1.2)
            col=(int(GREEN[0]*a),int(GREEN[1]*a),int(GREEN[2]*a))
            ts=FONT_HUGE.render("GO!",True,col)
            surf.blit(ts,(W//2-ts.get_width()//2,H//2-ts.get_height()//2))

    def _result(self,surf):
        k=self.knocked
        if k==10: msg,col="STRIKE !!!",GOLD
        elif k>=7: msg,col=f"{k} pins!  Great!",GREEN
        elif k>=4: msg,col=f"{k} pins",ACCENT
        else:       msg,col=f"{k} pins",WHITE
        ts=FONT_BIG.render(msg,True,col)
        surf.blit(ts,(W//2-ts.get_width()//2,H//2-40))
        rs=FONT_SM.render(f"Balls left: {self.balls}",True,GRAY)
        surf.blit(rs,(W//2-rs.get_width()//2,H//2+40))

    def _gameover(self,surf,mx,my):
        panel=pygame.Rect(W//2-260,H//2-190,520,380)
        pygame.draw.rect(surf,DARK_GRAY,panel,border_radius=18)
        pygame.draw.rect(surf,GOLD,panel,2,border_radius=18)
        txt_c(surf,"ROUND OVER",FONT_BIG,GOLD,H//2-170)
        txt_c(surf,f"Score: {self.score}",FONT_MED,WHITE,H//2-80)
        txt_c(surf,f"Pins knocked: {self.total_k} / 10",FONT_SM,ACCENT,H//2-20)
        if   self.score>=80: g,c="AMAZING !",GOLD
        elif self.score>=50: g,c="GREAT GAME !",GREEN
        elif self.score>=20: g,c="GOOD TRY !",ACCENT
        else:                g,c="KEEP GOING !",GRAY
        txt_c(surf,g,FONT_MED,c,H//2+40)
        draw_btn(surf,"PLAY AGAIN",self.btn_again,self.btn_again.collidepoint(mx,my))
        txt_c(surf,"R key = restart",FONT_XS,GRAY,H//2+185)


game=Game()
while True:
    dt=clock.tick(60)/1000.0
    for event in pygame.event.get():
        if event.type==pygame.QUIT:
            with gesture_lock: gesture_data["running"]=False
            pygame.quit(); sys.exit()
        elif event.type==pygame.KEYDOWN:
            if event.key==pygame.K_ESCAPE:
                with gesture_lock: gesture_data["running"]=False
                pygame.quit(); sys.exit()
            game.on_key(event.key)
        elif event.type==pygame.MOUSEBUTTONDOWN:
            if event.button==1: game.on_click(event.pos)
    game.update(dt)
    game.draw(screen)
    pygame.display.flip()

