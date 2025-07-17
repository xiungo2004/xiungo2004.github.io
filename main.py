import tkinter as tk
from tkinter import ttk  # Import ttk for themed widgets
from datetime import date, datetime
from tkinter import messagebox
import os
from turtle import title

desktop = r'C:\Users\devdu\OneDrive\Tài liệu\git\_posts'

# Function to save the input data
def save_data():
    tittle = title_entry.get()
    id = id_entry.get()
    date = date_entry.get()
    time = time_entry.get()
    content = content_entry.get("1.0", "end-1c")  # Get content from Text widget
    #Xuống 2 xuống dòng thay vì 1
    content.replace('\n','\n\n')
    if not tittle : 
        tittle = content.split("\n")[0]
    
    tittle = tittle.replace("\"", " ")

    # Check if any field is empty
    if not (id and date and time and content):
        messagebox.showerror("Error", "Please fill in all fields")
        return
        

    # Rest of your code to create the markdown file and display data in a messagebox
    linh = """---
# multilingual page pair id, this must pair with translations of this page. (This name must be unique)
lng_pair: " """ + tittle + """ "
title: " """ + tittle + """ "
# post specific
# if not specified, .name will be used from _data/owner/[language].yml
#author: Xíu
# multiple category is not supported
category: Facebook
# multiple tag entries are possible
tags: [Facebook]
# thumbnail image for post
img: "https://xiungo2004.github.io/img/""" + id + """.jpg"
# disable comments on this page
#comments_disable: false
# publish date
date: """ + date + """ """ + time + """ +0900
# seo
# if not specified, date will be used.
#meta_modify_date: """ + date + """ """ + time + """ +0900
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
<img src= "https://xiungo2004.github.io/img/"""+id + """.jpg">"""

    linh = linh.replace("\n", "\n\n")
    # ghi file
    filename = os.path.join(desktop, date + "-"+id+".markdown")
    with open(filename, "w", encoding="utf-8") as f:
        f.write(linh)

    # Hiển thị thông báo
    messagebox.showinfo("Success", "Data saved successfully")
    
# Create the main window
root = tk.Tk()
root.title("Ý ngố Information")

# Create a frame to organize the widgets
frame = ttk.Frame(root, padding=10)
frame.grid(column=0, row=0, sticky=(tk.W, tk.E, tk.N, tk.S))


root.option_add("*Font", "Arial 18")

# Title input
title_label = ttk.Label(frame, text="Title:")
title_label.grid(column=0, row=0, sticky=tk.W)
title_entry = ttk.Entry(frame)
title_entry.grid(column=1, row=0, columnspan=2, sticky=(tk.W, tk.E))

# Id input
id_label = ttk.Label(frame, text="Id:")
id_label.grid(column=0, row=1, sticky=tk.W)
id_entry = ttk.Entry(frame)
id_entry.grid(column=1, row=1, columnspan=2, sticky=(tk.W, tk.E))

# Date input
date_label = ttk.Label(frame, text="Date (yyyy-mm-dd):")
date_label.grid(column=0, row=2, sticky=tk.W)
date = date.today().strftime('%Y-%m-%d')  # Default to today's date
date_entry = ttk.Entry(frame)
date_entry.insert(0, date)
date_entry.grid(column=1, row=2, columnspan=2, sticky=(tk.W, tk.E))

# Time input
time_label = ttk.Label(frame, text="Time (hh:mm:ss 24h):")
time_label.grid(column=0, row=3, sticky=tk.W)
current_time = datetime.now().strftime('%H:%M:%S')  # Default to current time
time_entry = ttk.Entry(frame)
time_entry.insert(0, current_time)
time_entry.grid(column=1, row=3, columnspan=2, sticky=(tk.W, tk.E))

# Content input
content_label = ttk.Label(frame, text="Content:")
content_label.grid(column=0, row=4, sticky=tk.W)
content_entry = tk.Text(frame, height=10, width=30)
content_entry.grid(column=1, row=4, columnspan=2, sticky=(tk.W, tk.E))

# Save button
save_button = ttk.Button(frame, text="Save", command=save_data)
save_button.grid(column=1, row=5, sticky=(tk.W, tk.E))

# Set the weight of the rows and columns to make the input fields expand
frame.columnconfigure(1, weight=1)
frame.rowconfigure(4, weight=1)

root.mainloop()
