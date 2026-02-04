from PIL import Image

def make_transparent(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # Check if white (or close to white)
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
             newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

try:
    make_transparent('assets/logo_final.png', 'assets/logo_v2.png')
    print("Success")
except Exception as e:
    print(f"Error: {e}")
