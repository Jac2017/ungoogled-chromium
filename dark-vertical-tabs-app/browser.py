"""
Claum-style Glass Browser — Vertical Tabs Edition
Standalone desktop browser with frosted glass UI, vertical tab sidebar,
and Claum's design language: glass surfaces, #D97757 orange accent,
backdrop blur, system fonts, and radial gradient backgrounds.

Windows:  pyinstaller --onefile --noconsole --name DarkVerticalTabs browser.py
macOS:    python3 build_macos.py   (produces DarkVerticalTabs.dmg)
"""

import sys
import os
from PySide6.QtCore import (
    Qt, QUrl, QSize, QRect, QRectF, QPointF, QPropertyAnimation,
    QEasingCurve, Property, Signal, QTimer, QByteArray, QMargins,
)
from PySide6.QtGui import (
    QIcon, QPixmap, QPainter, QColor, QFont, QFontDatabase,
    QPen, QBrush, QLinearGradient, QRadialGradient, QPainterPath,
    QCursor, QAction, QImage, QPalette,
)
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QScrollArea, QLineEdit, QLabel, QPushButton, QSizePolicy,
    QToolTip, QMenu, QSplitter, QGraphicsDropShadowEffect,
)
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile


# ====================================================================
# Claum Glass Theme — Colors and Constants
# Matches Jac2017/claum-browser design tokens
# ====================================================================
class Theme:
    # Brand
    ORANGE        = QColor(0xD9, 0x77, 0x57)
    ORANGE_SOFT   = QColor(217, 119, 87, 46)     # rgba(217,119,87,0.18)
    ORANGE_GLOW   = QColor(217, 119, 87, 26)     # rgba(217,119,87,0.10)

    # Backgrounds
    BG_BASE       = QColor(0x1B, 0x1B, 0x1F)
    BG_SIDEBAR    = QColor(15, 15, 17, 247)       # rgba(15,15,17,0.97)
    BG_GLASS      = QColor(255, 255, 255, 26)     # rgba(255,255,255,0.10)
    BG_ELEVATED   = QColor(255, 255, 255, 15)     # rgba(255,255,255,0.06)
    BG_INPUT      = QColor(28, 28, 30, 179)       # rgba(28,28,30,0.70)
    BG_INPUT_FOCUS = QColor(28, 28, 30, 217)      # rgba(28,28,30,0.85)
    BG_CARD       = QColor(28, 28, 30, 140)       # rgba(28,28,30,0.55)

    # Borders
    BORDER_GLASS  = QColor(255, 255, 255, 36)     # rgba(255,255,255,0.14)
    BORDER_SUBTLE = QColor(255, 255, 255, 15)     # rgba(255,255,255,0.06)
    BORDER_INPUT  = QColor(255, 255, 255, 20)     # rgba(255,255,255,0.08)

    # Text
    TEXT_PRIMARY   = QColor(255, 255, 255, 235)   # rgba(255,255,255,0.92)
    TEXT_SECONDARY = QColor(255, 255, 255, 158)   # rgba(255,255,255,0.62)
    TEXT_TERTIARY  = QColor(255, 255, 255, 102)   # rgba(255,255,255,0.40)

    # Accents
    ACCENT_BLUE       = QColor(10, 132, 255)
    ACCENT_BLUE_12    = QColor(10, 132, 255, 31)  # rgba(10,132,255,0.12)
    ACCENT_BLUE_20    = QColor(10, 132, 255, 51)  # rgba(10,132,255,0.20)
    ACCENT_BLUE_40    = QColor(10, 132, 255, 102)  # rgba(10,132,255,0.40)
    CLOSE_RED         = QColor(0xFF, 0x45, 0x3A)
    CLOSE_RED_BG      = QColor(255, 69, 58, 77)   # rgba(255,69,58,0.30)

    # Hover / active
    HOVER_BG      = QColor(255, 255, 255, 13)     # rgba(255,255,255,0.05)
    ACTIVE_TAB_BG = QColor(10, 132, 255, 31)      # 0.12 alpha

    # Shadows
    SHADOW_DEEP   = QColor(0, 0, 0, 115)
    SHADOW_SOFT   = QColor(0, 0, 0, 46)

    # Purple glow for background gradient
    PURPLE_GLOW   = QColor(120, 140, 255, 15)

    # Layout
    SIDEBAR_W     = 240
    TAB_H         = 36
    HEADER_H      = 48
    FOOTER_H      = 32
    RADIUS_LG     = 18
    RADIUS_MD     = 12
    RADIUS_SM     = 8


# ====================================================================
# System Font — Claum uses the platform system font
# ====================================================================
def sys_font(size=13, bold=False, weight=None):
    if sys.platform == "darwin":
        families = ["-apple-system", "SF Pro Text", "Helvetica Neue"]
    elif sys.platform == "win32":
        families = ["Segoe UI", "Arial"]
    else:
        families = ["Ubuntu", "Cantarell", "Liberation Sans", "sans-serif"]

    for name in families:
        f = QFont(name, size)
        if weight:
            f.setWeight(weight)
        elif bold:
            f.setWeight(QFont.Weight.DemiBold)
        return f
    return QFont("sans-serif", size)


def group_header_font():
    f = sys_font(11, bold=True)
    f.setWeight(QFont.Weight.DemiBold)
    f.setCapitalization(QFont.Capitalization.AllUppercase)
    f.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, 0.5)
    return f


# ====================================================================
# Tab Item — Claum-style glass tab
# ====================================================================
class TabItem(QWidget):
    clicked = Signal()
    close_requested = Signal()
    middle_clicked = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._title = "New Tab"
        self._favicon = QPixmap()
        self._is_active = False
        self._is_hovered = False
        self._close_hovered = False
        self._is_loading = False
        self._is_pinned = False
        self.setMouseTracking(True)
        self.setFixedHeight(Theme.TAB_H)
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

    def set_title(self, title):
        self._title = title or "New Tab"
        self.update()

    def set_favicon(self, icon):
        if icon and not icon.isNull():
            self._favicon = icon.pixmap(QSize(16, 16))
        else:
            self._favicon = QPixmap()
        self.update()

    def set_active(self, active):
        self._is_active = active
        self.update()

    def set_loading(self, loading):
        self._is_loading = loading
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        bounds = self.rect().adjusted(2, 1, -2, -1)

        # ---- Background ----
        path = QPainterPath()
        path.addRoundedRect(QRectF(bounds), Theme.RADIUS_SM, Theme.RADIUS_SM)

        if self._is_active:
            p.fillPath(path, QBrush(Theme.ACTIVE_TAB_BG))
            # Active border
            p.setPen(QPen(Theme.ACCENT_BLUE_20, 1))
            p.drawPath(path)
        elif self._is_hovered:
            p.fillPath(path, QBrush(Theme.HOVER_BG))
        p.setPen(Qt.PenStyle.NoPen)

        # ---- Favicon ----
        favicon_x = bounds.x() + 10
        favicon_y = bounds.y() + (bounds.height() - 16) // 2

        if not self._favicon.isNull():
            # Draw with 3px border-radius clip
            fav_path = QPainterPath()
            fav_path.addRoundedRect(QRectF(favicon_x, favicon_y, 16, 16), 3, 3)
            p.setClipPath(fav_path)
            p.drawPixmap(favicon_x, favicon_y, self._favicon)
            p.setClipping(False)
        else:
            # Fallback: first letter in a subtle circle
            p.setPen(Qt.PenStyle.NoPen)
            p.setBrush(QBrush(Theme.BG_ELEVATED))
            p.drawRoundedRect(QRectF(favicon_x, favicon_y, 16, 16), 3, 3)
            letter = self._title[0].upper() if self._title else "?"
            p.setPen(QPen(Theme.TEXT_TERTIARY))
            p.setFont(sys_font(9, bold=True))
            p.drawText(QRectF(favicon_x, favicon_y, 16, 16),
                       Qt.AlignmentFlag.AlignCenter, letter)

        # ---- Title ----
        text_x = favicon_x + 24
        close_w = 24 if self._is_hovered else 0
        text_w = bounds.right() - text_x - close_w - 4
        if text_w > 0:
            color = Theme.TEXT_PRIMARY if self._is_active else Theme.TEXT_SECONDARY
            p.setPen(QPen(color))
            p.setFont(sys_font(12))
            elided = p.fontMetrics().elidedText(
                self._title, Qt.TextElideMode.ElideRight, int(text_w))
            p.drawText(QRectF(text_x, bounds.y(), text_w, bounds.height()),
                       Qt.AlignmentFlag.AlignVCenter, elided)

        # ---- Close button (on hover) ----
        if self._is_hovered:
            cx = bounds.right() - 20
            cy = bounds.y() + bounds.height() // 2
            if self._close_hovered:
                p.setPen(Qt.PenStyle.NoPen)
                p.setBrush(QBrush(Theme.CLOSE_RED_BG))
                p.drawEllipse(QPointF(cx, cy), 9, 9)
                p.setPen(QPen(Theme.CLOSE_RED))
            else:
                p.setPen(QPen(Theme.TEXT_TERTIARY))
            p.setFont(sys_font(11))
            p.drawText(QRectF(cx - 9, cy - 9, 18, 18),
                       Qt.AlignmentFlag.AlignCenter, "×")

        # ---- Loading indicator ----
        if self._is_loading:
            p.setPen(QPen(Theme.ACCENT_BLUE, 2))
            p.setBrush(Qt.BrushStyle.NoBrush)
            p.drawRoundedRect(QRectF(bounds).adjusted(0.5, 0.5, -0.5, -0.5),
                              Theme.RADIUS_SM, Theme.RADIUS_SM)

        p.end()

    def enterEvent(self, event):
        self._is_hovered = True
        self.update()

    def leaveEvent(self, event):
        self._is_hovered = False
        self._close_hovered = False
        self.update()

    def mouseMoveEvent(self, event):
        if self._is_hovered:
            cx = self.rect().right() - 22
            cy = self.rect().height() // 2
            dist = ((event.position().x() - cx) ** 2 +
                    (event.position().y() - cy) ** 2) ** 0.5
            new_hover = dist <= 10
            if new_hover != self._close_hovered:
                self._close_hovered = new_hover
                self.update()

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            if self._close_hovered:
                self.close_requested.emit()
            else:
                self.clicked.emit()
        elif event.button() == Qt.MouseButton.MiddleButton:
            self.middle_clicked.emit()


# ====================================================================
# Vertical Tab Sidebar — Claum glass panel
# ====================================================================
class VerticalTabSidebar(QWidget):
    new_tab_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._tab_items = []
        self.setFixedWidth(Theme.SIDEBAR_W)
        self.setMouseTracking(True)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Header
        header = QWidget()
        header.setFixedHeight(Theme.HEADER_H)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(16, 0, 12, 0)

        title = QLabel("Tabs")
        title.setFont(sys_font(14, bold=True))
        title.setStyleSheet(f"color: {Theme.TEXT_PRIMARY.name()}; background: transparent;")
        header_layout.addWidget(title)
        header_layout.addStretch()

        new_btn = QPushButton("+")
        new_btn.setFixedSize(28, 28)
        new_btn.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        new_btn.setFont(sys_font(16))
        new_btn.setStyleSheet(f"""
            QPushButton {{
                background: transparent;
                color: {Theme.TEXT_SECONDARY.name()};
                border: 1px dashed rgba(255,255,255,0.10);
                border-radius: 14px;
            }}
            QPushButton:hover {{
                background: rgba(10,132,255,0.12);
                border: 1px solid rgba(10,132,255,0.20);
                color: rgba(10,132,255,0.95);
            }}
        """)
        new_btn.clicked.connect(self.new_tab_requested.emit)
        header_layout.addWidget(new_btn)
        layout.addWidget(header)

        # Search
        self._search = QLineEdit()
        self._search.setPlaceholderText("Search tabs...")
        self._search.setFixedHeight(30)
        self._search.setFont(sys_font(12))
        self._search.setStyleSheet(f"""
            QLineEdit {{
                background: rgba(28,28,30,0.70);
                color: {Theme.TEXT_PRIMARY.name()};
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                padding: 0 10px;
                margin: 0 10px 6px 10px;
            }}
            QLineEdit:focus {{
                border-color: rgba(10,132,255,0.40);
                background: rgba(28,28,30,0.90);
            }}
            QLineEdit::placeholder {{
                color: rgba(255,255,255,0.40);
            }}
        """)
        self._search.textChanged.connect(self._filter_tabs)
        layout.addWidget(self._search)

        # Scroll area for tabs
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        scroll.setStyleSheet("""
            QScrollArea { background: transparent; border: none; }
            QWidget#tabContainer { background: transparent; }
            QScrollBar:vertical {
                background: transparent; width: 4px; margin: 0;
            }
            QScrollBar::handle:vertical {
                background: rgba(255,255,255,0.15); border-radius: 2px;
                min-height: 20px;
            }
            QScrollBar::handle:vertical:hover {
                background: rgba(255,255,255,0.25);
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical,
            QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {
                background: none; height: 0;
            }
        """)

        self._tab_container = QWidget()
        self._tab_container.setObjectName("tabContainer")
        self._tab_layout = QVBoxLayout(self._tab_container)
        self._tab_layout.setContentsMargins(6, 2, 6, 2)
        self._tab_layout.setSpacing(1)
        self._tab_layout.addStretch()
        scroll.setWidget(self._tab_container)
        layout.addWidget(scroll)

        # Footer
        self._footer = QLabel("0 tabs")
        self._footer.setFont(sys_font(11))
        self._footer.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._footer.setFixedHeight(Theme.FOOTER_H)
        self._footer.setStyleSheet(
            f"color: {Theme.TEXT_TERTIARY.name()}; background: transparent;")
        layout.addWidget(self._footer)

    def add_tab_item(self):
        item = TabItem()
        self._tab_layout.insertWidget(self._tab_layout.count() - 1, item)
        self._tab_items.append(item)
        self._update_count()
        return item

    def remove_tab_item(self, item):
        if item in self._tab_items:
            self._tab_items.remove(item)
            self._tab_layout.removeWidget(item)
            item.deleteLater()
            self._update_count()

    def _update_count(self):
        n = len(self._tab_items)
        self._footer.setText(f"{n} tab{'s' if n != 1 else ''}")

    def _filter_tabs(self, text):
        text = text.lower()
        for item in self._tab_items:
            item.setVisible(not text or text in item._title.lower())

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        r = self.rect()

        # Sidebar background — near-opaque dark
        p.fillRect(r, Theme.BG_SIDEBAR)

        # Right border — glass edge
        p.setPen(QPen(Theme.BORDER_GLASS))
        p.drawLine(r.right(), 0, r.right(), r.bottom())

        # Subtle orange glow at top
        glow = QRadialGradient(QPointF(r.width() / 2, 0), r.width())
        glow.setColorAt(0, QColor(217, 119, 87, 10))
        glow.setColorAt(1, QColor(0, 0, 0, 0))
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QBrush(glow))
        p.drawRect(0, 0, r.width(), 100)

        p.end()


# ====================================================================
# Glass URL Bar
# ====================================================================
class UrlBar(QLineEdit):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFont(sys_font(13))
        self.setStyleSheet("""
            QLineEdit {
                background: rgba(28,28,30,0.72);
                color: rgba(255,255,255,0.92);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                padding: 6px 16px;
                selection-background-color: rgba(10,132,255,0.40);
            }
            QLineEdit:focus {
                border-color: rgba(10,132,255,0.50);
                background: rgba(28,28,30,0.85);
                box-shadow: 0 0 0 3px rgba(10,132,255,0.15);
            }
        """)
        self.setPlaceholderText("Search or enter URL")


# ====================================================================
# Glass Navigation Toolbar
# ====================================================================
class NavToolbar(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(48)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 6, 12, 6)
        layout.setSpacing(6)

        btn_style = """
            QPushButton {
                background: rgba(255,255,255,0.06);
                color: rgba(255,255,255,0.62);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                font-size: 15px;
                min-width: 32px; max-width: 32px;
                min-height: 32px; max-height: 32px;
            }
            QPushButton:hover {
                background: rgba(255,255,255,0.10);
                color: rgba(255,255,255,0.92);
                border-color: rgba(255,255,255,0.14);
            }
            QPushButton:pressed {
                background: rgba(255,255,255,0.05);
            }
        """

        self.back_btn = QPushButton("←")
        self.back_btn.setStyleSheet(btn_style)
        layout.addWidget(self.back_btn)

        self.fwd_btn = QPushButton("→")
        self.fwd_btn.setStyleSheet(btn_style)
        layout.addWidget(self.fwd_btn)

        self.reload_btn = QPushButton("↻")
        self.reload_btn.setStyleSheet(btn_style)
        layout.addWidget(self.reload_btn)

        self.url_bar = UrlBar()
        layout.addWidget(self.url_bar)

    def paintEvent(self, event):
        p = QPainter(self)
        r = self.rect()
        # Glass toolbar background
        p.fillRect(r, Theme.BG_GLASS)
        # Bottom border
        p.setPen(QPen(Theme.BORDER_GLASS))
        p.drawLine(0, r.bottom(), r.right(), r.bottom())
        p.end()


# ====================================================================
# Main Browser Window
# ====================================================================
class BrowserWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Claum — Glass Vertical Tabs")
        self.setMinimumSize(1024, 640)
        self.resize(1400, 900)
        self._tabs = []

        # Global stylesheet
        self.setStyleSheet("""
            QMainWindow { background: #1B1B1F; }
            QWidget { background: transparent; }
            QToolTip {
                background: rgba(28,28,30,0.88);
                color: rgba(255,255,255,0.92);
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: 8px;
                padding: 6px 10px;
            }
        """)

        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QHBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Sidebar
        self._sidebar = VerticalTabSidebar()
        self._sidebar.new_tab_requested.connect(
            lambda: self._add_tab("https://start.duckduckgo.com"))
        main_layout.addWidget(self._sidebar)

        # Right panel
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(0)

        # Toolbar
        self._toolbar = NavToolbar()
        self._toolbar.back_btn.clicked.connect(self._go_back)
        self._toolbar.fwd_btn.clicked.connect(self._go_forward)
        self._toolbar.reload_btn.clicked.connect(self._reload)
        self._toolbar.url_bar.returnPressed.connect(self._navigate)
        right_layout.addWidget(self._toolbar)

        # Web view stack
        self._web_stack = QWidget()
        self._web_stack_layout = QVBoxLayout(self._web_stack)
        self._web_stack_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.addWidget(self._web_stack)

        main_layout.addWidget(right_panel)

        # Shortcuts
        self._setup_shortcuts()
        if sys.platform == "darwin":
            self._setup_macos_menu()

        self._add_tab("https://start.duckduckgo.com")

    def paintEvent(self, event):
        """Draw radial gradient background matching Claum's design."""
        p = QPainter(self)
        r = self.rect()
        p.fillRect(r, Theme.BG_BASE)

        # Orange glow at top
        g1 = QRadialGradient(QPointF(r.width() * 0.3, 0), r.width() * 0.7)
        g1.setColorAt(0, QColor(217, 119, 87, 26))
        g1.setColorAt(1, QColor(0, 0, 0, 0))
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QBrush(g1))
        p.drawRect(r)

        # Purple glow at bottom-right
        g2 = QRadialGradient(QPointF(r.width() * 0.85, r.height()), r.width() * 0.6)
        g2.setColorAt(0, QColor(120, 140, 255, 15))
        g2.setColorAt(1, QColor(0, 0, 0, 0))
        p.setBrush(QBrush(g2))
        p.drawRect(r)

        p.end()

    def _add_tab(self, url="about:blank"):
        webview = QWebEngineView()
        webview.setUrl(QUrl(url))
        webview.setVisible(False)
        self._web_stack_layout.addWidget(webview)

        tab_item = self._sidebar.add_tab_item()
        tab_item.set_title("New Tab")

        index = len(self._tabs)
        self._tabs.append((tab_item, webview))

        tab_item.clicked.connect(lambda idx=index: self._activate_tab(idx))
        tab_item.close_requested.connect(lambda idx=index: self._close_tab(idx))
        tab_item.middle_clicked.connect(lambda idx=index: self._close_tab(idx))

        webview.titleChanged.connect(
            lambda title, ti=tab_item: ti.set_title(title))
        webview.iconChanged.connect(
            lambda icon, ti=tab_item: ti.set_favicon(icon))
        webview.loadStarted.connect(
            lambda ti=tab_item: ti.set_loading(True))
        webview.loadFinished.connect(
            lambda ok, ti=tab_item: ti.set_loading(False))
        webview.urlChanged.connect(self._on_url_changed)

        self._activate_tab(index)

    def _activate_tab(self, index):
        if index < 0 or index >= len(self._tabs):
            return
        for i, (item, view) in enumerate(self._tabs):
            active = (i == index)
            item.set_active(active)
            view.setVisible(active)
        _, webview = self._tabs[index]
        self._toolbar.url_bar.setText(webview.url().toString())

    def _close_tab(self, index):
        if index < 0 or index >= len(self._tabs):
            return
        if len(self._tabs) <= 1:
            self._tabs[0][1].setUrl(QUrl("about:blank"))
            return

        item, webview = self._tabs.pop(index)
        self._sidebar.remove_tab_item(item)
        self._web_stack_layout.removeWidget(webview)
        webview.deleteLater()
        self._rebind_signals()
        new_index = min(index, len(self._tabs) - 1)
        self._activate_tab(new_index)

    def _rebind_signals(self):
        for i, (item, webview) in enumerate(self._tabs):
            try:
                item.clicked.disconnect()
                item.close_requested.disconnect()
                item.middle_clicked.disconnect()
            except RuntimeError:
                pass
            item.clicked.connect(lambda idx=i: self._activate_tab(idx))
            item.close_requested.connect(lambda idx=i: self._close_tab(idx))
            item.middle_clicked.connect(lambda idx=i: self._close_tab(idx))

    def _get_active_index(self):
        for i, (item, _) in enumerate(self._tabs):
            if item._is_active:
                return i
        return 0

    def _navigate(self):
        url = self._toolbar.url_bar.text().strip()
        if not url:
            return
        if not url.startswith(("http://", "https://", "about:", "file://")):
            if "." in url and " " not in url:
                url = "https://" + url
            else:
                url = "https://duckduckgo.com/?q=" + url
        idx = self._get_active_index()
        if idx < len(self._tabs):
            self._tabs[idx][1].setUrl(QUrl(url))

    def _go_back(self):
        idx = self._get_active_index()
        if idx < len(self._tabs):
            self._tabs[idx][1].back()

    def _go_forward(self):
        idx = self._get_active_index()
        if idx < len(self._tabs):
            self._tabs[idx][1].forward()

    def _reload(self):
        idx = self._get_active_index()
        if idx < len(self._tabs):
            self._tabs[idx][1].reload()

    def _on_url_changed(self, url):
        idx = self._get_active_index()
        if idx < len(self._tabs) and self._tabs[idx][1].url() == url:
            self._toolbar.url_bar.setText(url.toString())

    def _setup_shortcuts(self):
        from PySide6.QtGui import QShortcut, QKeySequence
        QShortcut(QKeySequence.StandardKey.AddTab, self,
                  lambda: self._add_tab("https://start.duckduckgo.com"))
        QShortcut(QKeySequence.StandardKey.Close, self,
                  lambda: self._close_tab(self._get_active_index()))
        QShortcut(QKeySequence("Ctrl+L"), self,
                  lambda: (self._toolbar.url_bar.setFocus(),
                           self._toolbar.url_bar.selectAll()))
        QShortcut(QKeySequence.StandardKey.Refresh, self, self._reload)
        QShortcut(QKeySequence("Ctrl+Tab"), self, self._next_tab)
        QShortcut(QKeySequence("Ctrl+Shift+Tab"), self, self._prev_tab)

    def _next_tab(self):
        idx = self._get_active_index()
        self._activate_tab((idx + 1) % len(self._tabs))

    def _prev_tab(self):
        idx = self._get_active_index()
        self._activate_tab((idx - 1) % len(self._tabs))

    def _setup_macos_menu(self):
        menu_bar = self.menuBar()
        menu_bar.setNativeMenuBar(True)

        file_menu = menu_bar.addMenu("File")
        file_menu.addAction("New Tab", lambda: self._add_tab(
            "https://start.duckduckgo.com"), "Ctrl+T")
        file_menu.addAction("Close Tab", lambda: self._close_tab(
            self._get_active_index()), "Ctrl+W")
        file_menu.addSeparator()
        file_menu.addAction("Quit", QApplication.quit, "Ctrl+Q")

        edit_menu = menu_bar.addMenu("Edit")
        edit_menu.addAction("Cut", lambda: None, "Ctrl+X")
        edit_menu.addAction("Copy", lambda: None, "Ctrl+C")
        edit_menu.addAction("Paste", lambda: None, "Ctrl+V")
        edit_menu.addAction("Select All", lambda: None, "Ctrl+A")

        view_menu = menu_bar.addMenu("View")
        view_menu.addAction("Reload", self._reload, "Ctrl+R")
        view_menu.addAction("Next Tab", self._next_tab, "Ctrl+}")
        view_menu.addAction("Previous Tab", self._prev_tab, "Ctrl+{")


# ====================================================================
# Entry point
# ====================================================================
def main():
    if sys.platform == "darwin":
        os.environ.setdefault("QT_MAC_WANTS_LAYER", "1")
        QApplication.setHighDpiScaleFactorRoundingPolicy(
            Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)

    app = QApplication(sys.argv)
    app.setApplicationName("DarkVerticalTabs")
    app.setApplicationDisplayName("Claum — Glass Vertical Tabs")

    if sys.platform == "darwin":
        app.setOrganizationName("Claum")
        app.setOrganizationDomain("claum.app")

    palette = QPalette()
    palette.setColor(QPalette.ColorRole.Window, Theme.BG_BASE)
    palette.setColor(QPalette.ColorRole.WindowText, Theme.TEXT_PRIMARY)
    palette.setColor(QPalette.ColorRole.Base, QColor(28, 28, 30))
    palette.setColor(QPalette.ColorRole.Text, Theme.TEXT_PRIMARY)
    palette.setColor(QPalette.ColorRole.Button, QColor(38, 38, 40))
    palette.setColor(QPalette.ColorRole.ButtonText, Theme.TEXT_PRIMARY)
    palette.setColor(QPalette.ColorRole.Highlight, Theme.ACCENT_BLUE)
    palette.setColor(QPalette.ColorRole.HighlightedText, QColor(255, 255, 255))
    app.setPalette(palette)

    window = BrowserWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
