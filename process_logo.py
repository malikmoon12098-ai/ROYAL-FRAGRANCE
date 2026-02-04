from PIL import Image
import math

def distance(c1, c2):
    (r1,g1,b1) = c1
    (r2,g2,b2) = c2
    return math.sqrt((r1 - r2)**2 + (g1 - g2)**2 + (b1 - b2)**2)

def make_transparent(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # Calculate perceived brightness
        # Gold is bright, Background (even gray) is relatively dark
        brightness = (item[0] + item[1] + item[2]) / 3
        
        # Threshold increased to 90 to catch the gray box visible in user screenshot
        # Gold R(212)+G(175)+B(55) avg is ~147, so 90 is safe.
        if brightness < 90: 
            # Make it fully transparent
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

try:
    # Processing the original source again to avoid degradation
    make_transparent('assets/logo_source.png', 'assets/logo.png')
    print("Success")
except Exception as e:
    print(f"Error: {e}")
