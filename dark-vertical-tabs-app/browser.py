"""
Dark Vertical Tabs Browser — NASA Worm Edition
A standalone desktop browser with a dark vertical tab sidebar,
circular favicon indicators that expand on hover, and 1980s NASA worm
logotype-inspired typography throughout.

Windows:  pyinstaller --onefile --noconsole --name DarkVerticalTabs browser.py
macOS:    python3 build_macos.py   (produces DarkVerticalTabs.dmg)
"""

import sys
import os
from PySide6.QtCore import (
    Qt, QUrl, QSize, QRect, QRectF, QPointF, QPropertyAnimation,
    QEasingCurve, Property, Signal, QTimer, QByteArray,
)
from PySide6.QtGui import (
    QIcon, QPixmap, QPainter, QColor, QFont, QFontDatabase,
    QPen, QBrush, QLinearGradient, QPainterPath, QCursor,
    QAction, QImage,
)
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QScrollArea, QLineEdit, QLabel, QPushButton, QSizePolicy,
    QToolTip, QMenu, QSplitter,
)
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile


# ====================================================================
# NASA Worm Dark Theme Palette
# ====================================================================
class Theme:
    BG_VOID     = QColor(0x06, 0x08, 0x0F)
    BG_DEEP     = QColor(0x0B, 0x0E, 0x17)
    BG_SURFACE  = QColor(0x11, 0x16, 0x27)
    BG_ELEVATED = QColor(0x18, 0x20, 0x40)
    BG_HOVER    = QColor(0x1E, 0x2A, 0x52)
    BG_ACTIVE   = QColor(0x1A, 0x12, 0x30)

    WORM_RED        = QColor(0xFC, 0x3D, 0x21)
    WORM_RED_GLOW   = QColor(0xFC, 0x3D, 0x21, 0x59)
    WORM_RED_SUBTLE = QColor(0xFC, 0x3D, 0x21, 0x1F)

    TEXT_PRIMARY   = QColor(0xE8, 0xEA, 0xF0)
    TEXT_SECONDARY = QColor(0x88, 0x90, 0xA8)
    TEXT_MUTED     = QColor(0x50, 0x58, 0x78)

    RING_DEFAULT   = QColor(0x18, 0x20, 0x40)
    BORDER_SUBTLE  = QColor(255, 255, 255, 15)

    COLLAPSED_W = 52
    EXPANDED_W  = 260
    ITEM_H      = 44
    RING_SIZE   = 36
    ICON_SIZE   = 18
    HEADER_H    = 48
    FOOTER_H    = 32


# ====================================================================
# Worm Font Helper
# ====================================================================
def worm_font(size=11, bold=False):
    """Return a font approximating the 1980s NASA worm logotype."""
    families = ["Century Gothic", "Futura", "URW Gothic",
                "Avant Garde Gothic", "Gill Sans", "Segoe UI"]
    for name in families:
        db = QFontDatabase()
        if db.hasFamily(name):
            f = QFont(name, size)
            if bold:
                f.setWeight(QFont.Weight.Bold)
            else:
                f.setWeight(QFont.Weight.Medium)
            f.setLetterSpacing(QFont.SpacingType.PercentageSpacing, 108)
            return f
    f = QFont("sans-serif", size)
    f.setWeight(QFont.Weight.Bold if bold else QFont.Weight.Medium)
    return f


# ====================================================================
# Tab Item Widget — Circular favicon that expands on hover
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
        self._expanded = False
        self.setMouseTracking(True)
        self.setFixedHeight(Theme.ITEM_H)
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))

    def set_title(self, title):
        self._title = title or "New Tab"
        self.update()

    def set_favicon(self, icon):
        if icon and not icon.isNull():
            self._favicon = icon.pixmap(QSize(Theme.ICON_SIZE, Theme.ICON_SIZE))
        else:
            self._favicon = QPixmap()
        self.update()

    def set_active(self, active):
        self._is_active = active
        self.update()

    def set_loading(self, loading):
        self._is_loading = loading
        self.update()

    def set_expanded(self, expanded):
        self._expanded = expanded
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        bounds = self.rect()
        radius = Theme.ITEM_H / 2.0

        # ---- Background ----
        if self._is_active:
            p.setBrush(QBrush(Theme.BG_ACTIVE))
        elif self._is_hovered:
            p.setBrush(QBrush(Theme.BG_HOVER))
        else:
            p.setBrush(Qt.BrushStyle.NoBrush)
        p.setPen(Qt.PenStyle.NoPen)
        p.drawRoundedRect(QRectF(bounds), radius, radius)

        # ---- Active glow border ----
        if self._is_active:
            pen = QPen(Theme.WORM_RED_SUBTLE, 1.5)
            p.setPen(pen)
            p.setBrush(Qt.BrushStyle.NoBrush)
            r = QRectF(bounds).adjusted(1, 1, -1, -1)
            p.drawRoundedRect(r, radius - 1, radius - 1)

        # ---- Favicon ring ----
        fx = Theme.ITEM_H // 2
        fy = Theme.ITEM_H // 2
        ring_r = Theme.RING_SIZE / 2.0

        # Outer ring
        if self._is_active:
            ring_color = Theme.WORM_RED
        elif self._is_hovered:
            ring_color = Theme.TEXT_MUTED
        else:
            ring_color = Theme.RING_DEFAULT
        p.setPen(QPen(ring_color, 2.0))
        p.setBrush(Qt.BrushStyle.NoBrush)
        p.drawEllipse(QPointF(fx, fy), ring_r - 1, ring_r - 1)

        # Inner fill
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QBrush(Theme.BG_SURFACE))
        p.drawEllipse(QPointF(fx, fy), ring_r - 2.5, ring_r - 2.5)

        # Favicon or fallback letter
        if not self._favicon.isNull():
            ix = fx - Theme.ICON_SIZE // 2
            iy = fy - Theme.ICON_SIZE // 2
            p.drawPixmap(ix, iy, self._favicon)
        else:
            letter = self._title[0].upper() if self._title else "?"
            p.setPen(QPen(Theme.TEXT_SECONDARY))
            p.setFont(worm_font(11, bold=True))
            p.drawText(QRectF(fx - ring_r, fy - ring_r,
                              Theme.RING_SIZE, Theme.RING_SIZE),
                       Qt.AlignmentFlag.AlignCenter, letter)

        # ---- Title + close button (only when expanded) ----
        if self._expanded:
            text_x = Theme.ITEM_H + 6
            text_w = bounds.width() - text_x - 28
            if text_w > 0:
                color = Theme.WORM_RED if self._is_active else Theme.TEXT_PRIMARY
                p.setPen(QPen(color))
                p.setFont(worm_font(11))
                text_rect = QRectF(text_x, 0, text_w, bounds.height())
                elided = p.fontMetrics().elidedText(
                    self._title, Qt.TextElideMode.ElideRight, int(text_w))
                p.drawText(text_rect, Qt.AlignmentFlag.AlignVCenter, elided)

                # Close button
                if self._is_hovered:
                    cx = bounds.right() - 22
                    cy = bounds.height() // 2
                    if self._close_hovered:
                        p.setPen(Qt.PenStyle.NoPen)
                        p.setBrush(QBrush(Theme.WORM_RED))
                        p.drawEllipse(QPointF(cx, cy), 10, 10)
                        p.setPen(QPen(QColor(255, 255, 255)))
                    else:
                        p.setPen(QPen(Theme.TEXT_MUTED))
                    p.setFont(worm_font(12))
                    p.drawText(QRectF(cx - 10, cy - 10, 20, 20),
                               Qt.AlignmentFlag.AlignCenter, "\u00D7")

        # ---- Loading ring ----
        if self._is_loading:
            p.setPen(QPen(Theme.WORM_RED_GLOW, 2.0))
            p.setBrush(Qt.BrushStyle.NoBrush)
            p.drawEllipse(QPointF(fx, fy), ring_r + 2, ring_r + 2)

        p.end()

    def enterEvent(self, event):
        self._is_hovered = True
        self.update()

    def leaveEvent(self, event):
        self._is_hovered = False
        self._close_hovered = False
        self.update()

    def mouseMoveEvent(self, event):
        if self._expanded and self._is_hovered:
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
            if self._close_hovered and self._expanded:
                self.close_requested.emit()
            else:
                self.clicked.emit()
        elif event.button() == Qt.MouseButton.MiddleButton:
            self.middle_clicked.emit()


# ====================================================================
# Vertical Tab Sidebar
# ====================================================================
class VerticalTabSidebar(QWidget):
    new_tab_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._expanded = False
        self._anim_progress = 0.0
        self._tab_items = []
        self.setMouseTracking(True)
        self.setFixedWidth(Theme.COLLAPSED_W)

        # Animation
        self._animation = QPropertyAnimation(self, b"anim_progress")
        self._animation.setDuration(250)
        self._animation.setEasingCurve(QEasingCurve.Type.OutCubic)

        # Layout
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Header (painted in paintEvent, but we need a spacer)
        self._header = QWidget()
        self._header.setFixedHeight(Theme.HEADER_H)
        self._header.setMouseTracking(True)
        self._header.mousePressEvent = self._header_click
        layout.addWidget(self._header)

        # Search bar (visible when expanded)
        self._search = QLineEdit()
        self._search.setPlaceholderText("S E A R C H")
        self._search.setFixedHeight(30)
        self._search.setFont(worm_font(9))
        self._search.setStyleSheet(f"""
            QLineEdit {{
                background: {Theme.BG_SURFACE.name()};
                color: {Theme.TEXT_PRIMARY.name()};
                border: 1px solid {Theme.BORDER_SUBTLE.name()};
                border-radius: 15px;
                padding: 0 12px;
                margin: 4px 8px;
                font-size: 10px;
                letter-spacing: 2px;
            }}
            QLineEdit:focus {{
                border-color: {Theme.WORM_RED.name()};
            }}
            QLineEdit::placeholder {{
                color: {Theme.TEXT_MUTED.name()};
            }}
        """)
        self._search.setVisible(False)
        self._search.textChanged.connect(self._filter_tabs)
        layout.addWidget(self._search)

        # Scroll area for tabs
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setVerticalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setStyleSheet("""
            QScrollArea { background: transparent; border: none; }
            QWidget#tabContainer { background: transparent; }
        """)

        self._tab_container = QWidget()
        self._tab_container.setObjectName("tabContainer")
        self._tab_layout = QVBoxLayout(self._tab_container)
        self._tab_layout.setContentsMargins(4, 4, 4, 4)
        self._tab_layout.setSpacing(2)
        self._tab_layout.addStretch()
        scroll.setWidget(self._tab_container)
        layout.addWidget(scroll)

        # Footer
        self._footer_label = QLabel("0  T A B S")
        self._footer_label.setFont(worm_font(9))
        self._footer_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._footer_label.setFixedHeight(Theme.FOOTER_H)
        self._footer_label.setStyleSheet(
            f"color: {Theme.TEXT_MUTED.name()}; background: transparent;")
        layout.addWidget(self._footer_label)

    def _get_anim_progress(self):
        return self._anim_progress

    def _set_anim_progress(self, val):
        self._anim_progress = val
        w = Theme.COLLAPSED_W + int(
            (Theme.EXPANDED_W - Theme.COLLAPSED_W) * val)
        self.setFixedWidth(w)
        expanded = val > 0.5
        if expanded != self._expanded:
            self._expanded = expanded
            self._search.setVisible(expanded)
            for item in self._tab_items:
                item.set_expanded(expanded)
        self.update()

    anim_progress = Property(float, _get_anim_progress, _set_anim_progress)

    def _expand(self):
        self._animation.stop()
        self._animation.setStartValue(self._anim_progress)
        self._animation.setEndValue(1.0)
        self._animation.start()

    def _collapse(self):
        self._animation.stop()
        self._animation.setStartValue(self._anim_progress)
        self._animation.setEndValue(0.0)
        self._animation.start()

    def enterEvent(self, event):
        self._expand()

    def leaveEvent(self, event):
        self._collapse()

    def _header_click(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            # Check if clicking the + button area (right side of header)
            if event.position().x() > self._header.width() - 40:
                self.new_tab_requested.emit()

    def add_tab_item(self):
        item = TabItem()
        item.set_expanded(self._expanded)
        # Insert before the stretch
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
        label = "T A B" if n == 1 else "T A B S"
        self._footer_label.setText(f"{n}  {label}")

    def _filter_tabs(self, text):
        text = text.lower()
        for item in self._tab_items:
            visible = not text or text in item._title.lower()
            item.setVisible(visible)

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        bounds = self.rect()

        # Deep space background
        p.fillRect(bounds, Theme.BG_DEEP)

        # Right border
        p.setPen(QPen(Theme.BORDER_SUBTLE))
        p.drawLine(bounds.right(), 0, bounds.right(), bounds.bottom())

        # Header separator
        p.drawLine(0, Theme.HEADER_H, bounds.right(), Theme.HEADER_H)

        # NASA worm red dot (logo mark)
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QBrush(Theme.WORM_RED))
        p.drawEllipse(QPointF(20, Theme.HEADER_H / 2), 8, 8)

        # Inner ring on logo dot
        p.setPen(QPen(QColor(255, 255, 255, 77), 1.5))
        p.setBrush(Qt.BrushStyle.NoBrush)
        p.drawEllipse(QPointF(20, Theme.HEADER_H / 2), 5, 5)

        # Header title (fades in with expansion)
        if self._anim_progress > 0.3:
            alpha = min(255, int(255 * (self._anim_progress - 0.3) / 0.7))
            color = QColor(Theme.TEXT_PRIMARY)
            color.setAlpha(alpha)
            p.setPen(QPen(color))
            p.setFont(worm_font(12, bold=True))
            p.drawText(QRectF(36, 0, bounds.width() - 72, Theme.HEADER_H),
                       Qt.AlignmentFlag.AlignVCenter, "T  A  B  S")

        # New tab button (+)
        btn_size = 28
        bx = bounds.right() - btn_size - 8
        by = (Theme.HEADER_H - btn_size) // 2
        btn_rect = QRectF(bx, by, btn_size, btn_size)
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QBrush(Theme.BG_SURFACE))
        p.drawEllipse(btn_rect.center(), btn_size / 2, btn_size / 2)
        p.setPen(QPen(Theme.BORDER_SUBTLE, 1))
        p.setBrush(Qt.BrushStyle.NoBrush)
        p.drawEllipse(btn_rect.center(), btn_size / 2, btn_size / 2)
        p.setPen(QPen(Theme.TEXT_SECONDARY))
        p.setFont(worm_font(16))
        p.drawText(btn_rect, Qt.AlignmentFlag.AlignCenter, "+")

        # Footer separator
        fy = bounds.bottom() - Theme.FOOTER_H
        p.setPen(QPen(Theme.BORDER_SUBTLE))
        p.drawLine(0, fy, bounds.right(), fy)

        # CRT scanline overlay
        p.setPen(Qt.PenStyle.NoPen)
        scan_color = QColor(0, 0, 0, 5)
        p.setBrush(QBrush(scan_color))
        for y in range(0, bounds.height(), 4):
            p.drawRect(0, y, bounds.width(), 2)

        p.end()


# ====================================================================
# URL Bar
# ====================================================================
class UrlBar(QLineEdit):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFont(worm_font(11))
        self.setStyleSheet(f"""
            QLineEdit {{
                background: {Theme.BG_SURFACE.name()};
                color: {Theme.TEXT_PRIMARY.name()};
                border: 1px solid {Theme.BORDER_SUBTLE.name()};
                border-radius: 18px;
                padding: 6px 18px;
                selection-background-color: {Theme.WORM_RED.name()};
            }}
            QLineEdit:focus {{
                border-color: {Theme.WORM_RED.name()};
            }}
        """)
        self.setPlaceholderText("E N T E R   U R L")


# ====================================================================
# Navigation Toolbar
# ====================================================================
class NavToolbar(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(44)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(8, 4, 8, 4)
        layout.setSpacing(6)

        btn_style = f"""
            QPushButton {{
                background: {Theme.BG_SURFACE.name()};
                color: {Theme.TEXT_SECONDARY.name()};
                border: 1px solid {Theme.BORDER_SUBTLE.name()};
                border-radius: 14px;
                font-family: 'Century Gothic', 'Segoe UI', sans-serif;
                font-size: 14px;
                min-width: 28px; max-width: 28px;
                min-height: 28px; max-height: 28px;
            }}
            QPushButton:hover {{
                background: {Theme.WORM_RED.name()};
                color: white;
                border-color: {Theme.WORM_RED.name()};
            }}
        """

        self.back_btn = QPushButton("\u2190")
        self.back_btn.setStyleSheet(btn_style)
        layout.addWidget(self.back_btn)

        self.fwd_btn = QPushButton("\u2192")
        self.fwd_btn.setStyleSheet(btn_style)
        layout.addWidget(self.fwd_btn)

        self.reload_btn = QPushButton("\u21BB")
        self.reload_btn.setStyleSheet(btn_style)
        layout.addWidget(self.reload_btn)

        self.url_bar = UrlBar()
        layout.addWidget(self.url_bar)


# ====================================================================
# Main Browser Window
# ====================================================================
class BrowserWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Dark Vertical Tabs — NASA Worm Edition")
        self.setMinimumSize(1024, 640)
        self.resize(1400, 900)
        self._tabs = []  # list of (TabItem, QWebEngineView) pairs

        # Apply dark palette to entire app
        self.setStyleSheet(f"""
            QMainWindow {{ background: {Theme.BG_VOID.name()}; }}
            QWidget {{ background: {Theme.BG_VOID.name()}; }}
            QToolTip {{
                background: {Theme.BG_ELEVATED.name()};
                color: {Theme.TEXT_PRIMARY.name()};
                border: 1px solid {Theme.BORDER_SUBTLE.name()};
                padding: 4px 8px;
                font-family: 'Century Gothic', 'Segoe UI', sans-serif;
            }}
        """)

        # Central widget
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

        # Right panel (toolbar + webview stack)
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(0)

        # Navigation toolbar
        self._toolbar = NavToolbar()
        self._toolbar.back_btn.clicked.connect(self._go_back)
        self._toolbar.fwd_btn.clicked.connect(self._go_forward)
        self._toolbar.reload_btn.clicked.connect(self._reload)
        self._toolbar.url_bar.returnPressed.connect(self._navigate)
        right_layout.addWidget(self._toolbar)

        # Web view container (stacked, only active visible)
        self._web_stack = QWidget()
        self._web_stack_layout = QVBoxLayout(self._web_stack)
        self._web_stack_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.addWidget(self._web_stack)

        main_layout.addWidget(right_panel)

        # Platform-aware keyboard shortcuts
        self._setup_shortcuts()

        # macOS: native menu bar with standard items
        if sys.platform == "darwin":
            self._setup_macos_menu()

        # Open initial tab
        self._add_tab("https://start.duckduckgo.com")

    def _add_tab(self, url="about:blank"):
        webview = QWebEngineView()
        webview.setUrl(QUrl(url))
        webview.setVisible(False)
        self._web_stack_layout.addWidget(webview)

        tab_item = self._sidebar.add_tab_item()
        tab_item.set_title("New Tab")

        index = len(self._tabs)
        self._tabs.append((tab_item, webview))

        # Wire up signals
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
        # Update URL bar
        _, webview = self._tabs[index]
        self._toolbar.url_bar.setText(webview.url().toString())

    def _close_tab(self, index):
        if index < 0 or index >= len(self._tabs):
            return
        if len(self._tabs) <= 1:
            # Don't close last tab, navigate to blank
            self._tabs[0][1].setUrl(QUrl("about:blank"))
            return

        item, webview = self._tabs.pop(index)
        self._sidebar.remove_tab_item(item)
        self._web_stack_layout.removeWidget(webview)
        webview.deleteLater()

        # Re-bind signals with corrected indices
        self._rebind_signals()

        # Activate nearest tab
        new_index = min(index, len(self._tabs) - 1)
        self._activate_tab(new_index)

    def _rebind_signals(self):
        """Reconnect tab items to their correct indices after removal."""
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
        """Platform-aware keyboard shortcuts (Cmd on macOS, Ctrl elsewhere)."""
        from PySide6.QtGui import QShortcut, QKeySequence
        QShortcut(QKeySequence.StandardKey.AddTab, self,
                  lambda: self._add_tab("https://start.duckduckgo.com"))
        QShortcut(QKeySequence.StandardKey.Close, self,
                  lambda: self._close_tab(self._get_active_index()))
        QShortcut(QKeySequence("Ctrl+L"), self,
                  lambda: (self._toolbar.url_bar.setFocus(),
                           self._toolbar.url_bar.selectAll()))
        QShortcut(QKeySequence.StandardKey.Refresh, self, self._reload)
        # Cmd+Shift+] / Cmd+Shift+[ for tab cycling (macOS convention)
        QShortcut(QKeySequence("Ctrl+Tab"), self, self._next_tab)
        QShortcut(QKeySequence("Ctrl+Shift+Tab"), self, self._prev_tab)

    def _next_tab(self):
        idx = self._get_active_index()
        self._activate_tab((idx + 1) % len(self._tabs))

    def _prev_tab(self):
        idx = self._get_active_index()
        self._activate_tab((idx - 1) % len(self._tabs))

    def _setup_macos_menu(self):
        """Create a native macOS menu bar with standard items."""
        menu_bar = self.menuBar()
        menu_bar.setNativeMenuBar(True)

        # File menu
        file_menu = menu_bar.addMenu("File")
        file_menu.addAction("New Tab", lambda: self._add_tab(
            "https://start.duckduckgo.com"), "Ctrl+T")
        file_menu.addAction("Close Tab", lambda: self._close_tab(
            self._get_active_index()), "Ctrl+W")
        file_menu.addSeparator()
        file_menu.addAction("Quit", QApplication.quit, "Ctrl+Q")

        # Edit menu (for standard Cmd+C/V/X/A)
        edit_menu = menu_bar.addMenu("Edit")
        edit_menu.addAction("Cut", lambda: None, "Ctrl+X")
        edit_menu.addAction("Copy", lambda: None, "Ctrl+C")
        edit_menu.addAction("Paste", lambda: None, "Ctrl+V")
        edit_menu.addAction("Select All", lambda: None, "Ctrl+A")

        # View menu
        view_menu = menu_bar.addMenu("View")
        view_menu.addAction("Reload", self._reload, "Ctrl+R")
        view_menu.addAction("Next Tab", self._next_tab, "Ctrl+}")
        view_menu.addAction("Previous Tab", self._prev_tab, "Ctrl+{")


# ====================================================================
# Entry point
# ====================================================================
def main():
    # macOS: must be set before QApplication is created
    if sys.platform == "darwin":
        os.environ.setdefault("QT_MAC_WANTS_LAYER", "1")
        # Enable retina / high-DPI rendering
        QApplication.setHighDpiScaleFactorRoundingPolicy(
            Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)

    app = QApplication(sys.argv)
    app.setApplicationName("DarkVerticalTabs")
    app.setApplicationDisplayName("Dark Vertical Tabs — NASA Worm Edition")

    if sys.platform == "darwin":
        app.setOrganizationName("NASAWormEdition")
        app.setOrganizationDomain("darkverticaltabs.app")
        # macOS dark appearance
        app.setStyle("macOS")

    # Set app-wide dark palette
    from PySide6.QtGui import QPalette
    palette = QPalette()
    palette.setColor(QPalette.ColorRole.Window, Theme.BG_VOID)
    palette.setColor(QPalette.ColorRole.WindowText, Theme.TEXT_PRIMARY)
    palette.setColor(QPalette.ColorRole.Base, Theme.BG_SURFACE)
    palette.setColor(QPalette.ColorRole.Text, Theme.TEXT_PRIMARY)
    palette.setColor(QPalette.ColorRole.Button, Theme.BG_ELEVATED)
    palette.setColor(QPalette.ColorRole.ButtonText, Theme.TEXT_PRIMARY)
    palette.setColor(QPalette.ColorRole.Highlight, Theme.WORM_RED)
    palette.setColor(QPalette.ColorRole.HighlightedText, QColor(255, 255, 255))
    app.setPalette(palette)

    window = BrowserWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
