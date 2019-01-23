extern crate notify;

use std::ffi::{CStr,    // From C to Rust
               CString, // From Rust to C
               c_void}; // void*
use std::time::Duration;
use libc::{c_char, uint32_t};
use notify::{Watcher, RecursiveMode, watcher};
use notify::DebouncedEvent::*;
use std::sync::mpsc::channel;

const EVENT_OUT_NOTICE_WRITE: u32 = 0;
const EVENT_OUT_NOTICE_REMOVE: u32 = 1;
const EVENT_OUT_CREATE: u32 = 2;
const EVENT_OUT_WRITE: u32 = 3;
const EVENT_OUT_CHMOD: u32 = 4;
const EVENT_OUT_REMOVE: u32 = 5;
const EVENT_OUT_RENAME: u32 = 6;
const EVENT_OUT_RESCAN: u32 = 7;
const EVENT_OUT_ERROR: u32 = 8;

#[no_mangle]
pub extern "C" fn fileWatcherWatch(path_in: *const c_char,
                                   on_event: fn(uint32_t, *const c_char, *mut c_void),
                                   my_ptr: *mut c_void) {
    // Create a channel to receive the events.
    let (tx, rx) = channel();

    // Create a watcher object, delivering debounced events.
    // The notification back-end is selected based on the platform.
    let mut watcher = watcher(tx, Duration::from_millis(120)).unwrap();

    // Add a path to be watched. All files and directories at that path and
    // below will be monitored for changes.
    let file_path = unsafe { CStr::from_ptr(path_in) };
    watcher.watch(file_path.to_str().unwrap(), RecursiveMode::NonRecursive).unwrap();

    #[macro_export]
    macro_rules! to_cstr {
        ( $x:expr ) => {
            CString::new($x).unwrap().as_c_str().as_ptr()
        }
    }

    loop {
        match rx.recv() {
            Ok(event) => match event {
                NoticeWrite(buf) => on_event(EVENT_OUT_NOTICE_WRITE,
                    to_cstr!(buf.to_str().unwrap()), my_ptr),
                NoticeRemove(buf) => on_event(EVENT_OUT_NOTICE_REMOVE,
                    to_cstr!(buf.to_str().unwrap()), my_ptr),
                Create(buf) => on_event(EVENT_OUT_CREATE,
                    to_cstr!(buf.to_str().unwrap()), my_ptr),
                Write(buf) => on_event(EVENT_OUT_WRITE,
                    to_cstr!(buf.to_str().unwrap()), my_ptr),
                Chmod(buf) => on_event(EVENT_OUT_CHMOD,
                    to_cstr!(buf.to_str().unwrap()), my_ptr),
                Remove(buf) => on_event(EVENT_OUT_REMOVE,
                    to_cstr!(buf.to_str().unwrap()), my_ptr),
                Rename(buf, buf2) => on_event(EVENT_OUT_RENAME,
                    to_cstr!([buf.to_str().unwrap(), buf2.to_str().unwrap()].join(">")),
                    my_ptr),
                Rescan => on_event(EVENT_OUT_RESCAN, to_cstr!("rescan"),
                    my_ptr),
                Error(_, _) => on_event(EVENT_OUT_ERROR, to_cstr!("rescan"),
                    my_ptr),
            },
            Err(e) => println!("watch error: {:?}", e),
        }
    }
}
