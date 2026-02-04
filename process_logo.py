from PIL import Image

def make_transparent(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # Check if the pixel is black (or very close to black)
        # Using a threshold of 30 for R, G, B
        if item[0] < 30 and item[1] < 30 and item[2] < 30:
            # Make it transparent
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

try:
    make_transparent('assets/logo_source.png', 'assets/logo.png')
    print("Success")
except Exception as e:
    print(f"Error: {e}")
