bl_info = {
    "name": "Render Alert",
    "author": "Jideeh",
    "version": (2, 6, 0),
    "blender": (3, 6, 0),
    "location": "Properties > Render and 3D Viewport > N Panel > Render",
    "description": "Plays a customizable sound and optionally sends a phone notification when rendering is complete",
    "category": "Render",
}

import bpy
import os
import sys
import threading
import urllib.request
import urllib.parse
from bpy.app.handlers import persistent

try:
    import winsound
except Exception:
    winsound = None

_audio_device = None
_audio_handles = []

ADDON_ID = __package__ or __name__


def get_preferences():
    addon = bpy.context.preferences.addons.get(ADDON_ID)
    if addon:
        return addon.preferences
    return None


def cleanup_handles():
    global _audio_handles
    cleaned = []
    try:
        import aud
        for handle in _audio_handles:
            try:
                if handle.status != aud.STATUS_STOPPED:
                    cleaned.append(handle)
            except Exception:
                pass
    except Exception:
        cleaned = []
    _audio_handles = cleaned


def play_system_beep():
    if winsound:
        try:
            winsound.MessageBeep()
            return True
        except Exception:
            pass
    try:
        print("\a")
        return True
    except Exception:
        return False


def play_with_winsound(path):
    if not winsound:
        return False
    try:
        winsound.PlaySound(path, winsound.SND_FILENAME | winsound.SND_ASYNC)
        return True
    except Exception as error:
        print("Render Alert Sound winsound error:", error)
        return False


def play_with_aud(path, volume):
    global _audio_device
    try:
        import aud
        cleanup_handles()
        if _audio_device is None:
            _audio_device = aud.Device()
        sound = aud.Sound(path)
        handle = _audio_device.play(sound)
        try:
            handle.volume = volume
        except Exception:
            pass
        _audio_handles.append(handle)
        return True
    except Exception as error:
        print("Render Alert Sound aud error:", error)
        return False


def play_render_sound():
    prefs = get_preferences()

    if not prefs:
        play_system_beep()
        return

    if prefs.sound_mode == "BEEP":
        play_system_beep()
        return

    path = bpy.path.abspath(prefs.sound_path)

    if not path or not os.path.isfile(path):
        play_system_beep()
        return

    extension = os.path.splitext(path)[1].lower()

    if extension == ".wav" and sys.platform == "win32":
        if play_with_winsound(path):
            return

    if play_with_aud(path, prefs.volume):
        return

    play_system_beep()


def send_phone_notification():
    """Send a push notification to the phone via ntfy.sh.

    Runs the network request on a background thread so a slow or
    unreachable connection never freezes Blender's UI.
    """
    prefs = get_preferences()

    if not prefs or not prefs.notify_phone:
        return

    topic = prefs.ntfy_topic.strip()
    if not topic:
        print("Render Alert phone: no ntfy topic set, skipping notification")
        return

    server = prefs.ntfy_server.strip().rstrip("/")
    if not server:
        server = "https://ntfy.sh"

    message = prefs.ntfy_message.strip() or "Render complete!"
    title = prefs.ntfy_title.strip() or "Blender"

    url = server + "/" + urllib.parse.quote(topic)

    def _send():
        try:
            req = urllib.request.Request(
                url,
                data=message.encode("utf-8"),
                headers={
                    "Title": title,
                    "Tags": "white_check_mark",
                    "Priority": "default",
                },
            )
            urllib.request.urlopen(req, timeout=10)
        except Exception as error:
            print("Render Alert phone error:", error)

    threading.Thread(target=_send, daemon=True).start()


@persistent
def render_done_sound_handler(scene):
    play_render_sound()
    send_phone_notification()


def add_handler():
    if render_done_sound_handler not in bpy.app.handlers.render_complete:
        bpy.app.handlers.render_complete.append(render_done_sound_handler)


def remove_handler():
    while render_done_sound_handler in bpy.app.handlers.render_complete:
        bpy.app.handlers.render_complete.remove(render_done_sound_handler)


def draw_render_done_sound_ui(layout):
    prefs = get_preferences()

    if not prefs:
        layout.label(text="Preferences unavailable")
        return

    layout.prop(prefs, "sound_mode")

    if prefs.sound_mode == "FILE":
        layout.prop(prefs, "sound_path")
        layout.prop(prefs, "volume")

    box = layout.box()
    box.prop(prefs, "notify_phone")
    if prefs.notify_phone:
        box.prop(prefs, "ntfy_topic")
        col = box.column(align=True)
        col.prop(prefs, "ntfy_title")
        col.prop(prefs, "ntfy_message")
        box.prop(prefs, "ntfy_server")
        box.label(text="Subscribe to this topic in the ntfy phone app.", icon="INFO")

    layout.operator("render_done_sound.test", icon="PLAY")


class RENDER_DONE_SOUND_preferences(bpy.types.AddonPreferences):
    bl_idname = ADDON_ID

    sound_mode: bpy.props.EnumProperty(
        name="Sound Mode",
        items=[
            ("BEEP", "System Beep", "Use the default system beep"),
            ("FILE", "Custom File", "Use a custom audio file"),
        ],
        default="BEEP",
    )

    sound_path: bpy.props.StringProperty(
        name="Sound File",
        subtype="FILE_PATH",
        default="",
    )

    volume: bpy.props.FloatProperty(
        name="Volume",
        default=1.0,
        min=0.0,
        max=1.0,
        subtype="FACTOR",
    )

    notify_phone: bpy.props.BoolProperty(
        name="Notify Phone",
        description="Send a push notification to your phone via ntfy when a render finishes",
        default=False,
    )

    ntfy_topic: bpy.props.StringProperty(
        name="ntfy Topic",
        description="The topic name you subscribed to in the ntfy phone app. Use something unguessable",
        default="",
    )

    ntfy_title: bpy.props.StringProperty(
        name="Title",
        description="Notification title shown on your phone",
        default="Blender",
    )

    ntfy_message: bpy.props.StringProperty(
        name="Message",
        description="Notification body shown on your phone",
        default="Render complete!",
    )

    ntfy_server: bpy.props.StringProperty(
        name="Server",
        description="ntfy server URL. Leave as https://ntfy.sh unless you self-host",
        default="https://ntfy.sh",
    )

    def draw(self, context):
        draw_render_done_sound_ui(self.layout)


class RENDER_DONE_SOUND_OT_test(bpy.types.Operator):
    bl_idname = "render_done_sound.test"
    bl_label = "Test Alert"
    bl_description = "Play the selected render completion sound and send a test phone notification if enabled"

    def execute(self, context):
        play_render_sound()

        prefs = get_preferences()
        if prefs and prefs.notify_phone:
            send_phone_notification()
            self.report({"INFO"}, "Played sound and sent test phone notification")
        else:
            self.report({"INFO"}, "Played render completion sound")

        return {"FINISHED"}


class RENDER_DONE_SOUND_PT_render_properties_panel(bpy.types.Panel):
    bl_label = "Render Alert Sound"
    bl_idname = "RENDER_DONE_SOUND_PT_render_properties_panel"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "render"

    def draw(self, context):
        draw_render_done_sound_ui(self.layout)


class RENDER_DONE_SOUND_PT_view3d_panel(bpy.types.Panel):
    bl_label = "Render Alert"
    bl_idname = "RENDER_DONE_SOUND_PT_view3d_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Render Alert"

    def draw(self, context):
        draw_render_done_sound_ui(self.layout)


classes = (
    RENDER_DONE_SOUND_preferences,
    RENDER_DONE_SOUND_OT_test,
    RENDER_DONE_SOUND_PT_render_properties_panel,
    RENDER_DONE_SOUND_PT_view3d_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    add_handler()


def unregister():
    remove_handler()
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()