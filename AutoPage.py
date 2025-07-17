import tkinter as tk
from datetime import datetime

class App:
    def __init__(self, root):
        self.root = root

        # Lấy ngày và giờ hiện tại
        now = datetime.now()

        # Tạo các widget
        self.id_label = tk.Label(self.root, text="ID:")
        self.id_entry = tk.Entry(self.root)
        self.date_label = tk.Label(self.root, text="Ngày:")
        
        current_date = tk.StringVar()
        current_date.set(now.strftime("%Y-%m-%d"))

        self.date_entry = tk.Entry(self.root, textvariable = current_date)
        self.time_label = tk.Label(self.root, text="Giờ:")

        current_time = tk.StringVar()
        current_time.set("20:00:00")

        self.time_entry = tk.Entry(self.root, textvariable = current_time)
        self.tittle_label = tk.Label(self.root, text="Tittle:")
        self.tittle_entry = tk.Entry(self.root)
        self.content_label = tk.Label(self.root, text="Nội dung:")
        self.content_entry = tk.Text(self.root, width=50, height=10)
        self.save_button = tk.Button(self.root, text="Lưu", command=self.save)

        # Đặt vị trí các widget
        self.tittle_label.grid(row=3, column=0)
        self.tittle_entry.grid(row=3, column=1)
        self.id_label.grid(row=0, column=0)
        self.id_entry.grid(row=0, column=1)
        self.date_label.grid(row=1, column=0)
        self.date_entry.grid(row=1, column=1)
        self.time_label.grid(row=2, column=0)
        self.time_entry.grid(row=2, column=1)
        self.content_label.grid(row=4, column=0)
        self.content_entry.grid(row=4, column=1)
        self.save_button.grid(row=5, column=1)

    def save(self):
        # Lấy giá trị từ các ô nhập liệu
        id = self.id_entry.get()
        date = self.date_entry.get()
        time = self.time_entry.get()
        tittle = self.tittle_entry.get()
        content = self.content_entry.get("1.0", tk.END)

        # In ra màn hình giá trị đã nhập
        linh = """---
# multilingual page pair id, this must pair with translations of this page. (This name must be unique)
lng_pair: " """ + tittle +""" "
title: " """ +  tittle + """ "
# post specific
# if not specified, .name will be used from _data/owner/[language].yml
#author: Xíu
# multiple category is not supported
category: Facebook
# multiple tag entries are possible
tags: [Facebook]
# thumbnail image for post
img: "https://xiungo2004.github.io/img/"""+ id +    """.jpg"
# disable comments on this page
#comments_disable: false

# publish date
date: """ + date + """ """ + time + """ +0900

# seo
# if not specified, date will be used.
#meta_modify_date: """+ date + """ """ + time + """ +0900
# check the meta_common_description in _data/owner/[language].yml
#meta_description: ""

# optional
# if you enabled image_viewer_posts you don't need to enable this. This is only if image_viewer_posts = false
#image_viewer_on: true
# if you enabled image_lazy_loader_posts you don't need to enable this. This is only if image_lazy_loader_posts = false
#image_lazy_loader_on: true
# exclude from on site search
#on_site_search_exclude: true
# exclude from search engines
#search_engine_exclude: true
# to disable this page, simply set published: false or delete this file
#published: false
---
"""+content+"""
<!-- outline-end -->

<img src= "https://xiungo2004.github.io/img/"""+id +""".jpg">"""

        # Ghi vào file
        with open( date+ "-"+id+".markdown", "w", encoding="utf-8") as f:
            f.write(linh)


root = tk.Tk()
app = App(root)
root.mainloop()
