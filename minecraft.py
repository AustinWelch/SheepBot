import cv2
import numpy as np
import os
import sys
import time 


def pickBestPattern(patt_imgs, x, y, image):
    try:
        pic_errors = []
        for pic in patt_imgs:
            error_array = abs(pic - image[y:y+KERNEL_SIZE[1], x:x+KERNEL_SIZE[0]])
            error_array = error_array.flatten()
            error = error_array.sum()
            pic_errors.append(error)
        min_index = pic_errors.index(min(pic_errors))
        pic = patt_imgs[min_index]
        image[y:y+KERNEL_SIZE[1], x:x+KERNEL_SIZE[0]] = pic
    except:
        pass

def createCollage(largeImagePath):
    time.sleep(1) 
    large_image = cv2.imread(largeImagePath)
    large_image = np.asarray(large_image, dtype=float)

    patt_imgs = []
    for patt_img in os.listdir(IMAGE_REPO_PATH):
        filepath = IMAGE_REPO_PATH + '\\' + patt_img
        img = cv2.imread(filepath)
        img = cv2.resize(img, KERNEL_SIZE)
        img = np.asarray(img, dtype=float)
        patt_imgs.append(img)

    for y in range(0, large_image.shape[0] - KERNEL_SIZE[1]+1, KERNEL_SIZE[1]):
        for x in range(0, large_image.shape[1] - KERNEL_SIZE[0]+1, KERNEL_SIZE[0]):
            pickBestPattern(patt_imgs, x, y, large_image)

    cv2.imwrite(".\\images\\pic_" + img_id + "_out.png", large_image)
        

input_file = sys.argv[1]
img_id = sys.argv[2]
kernal_size = int(sys.argv[3])
KERNEL_SIZE = (kernal_size, kernal_size)
IMAGE_REPO_PATH = '.\\minecraft'
createCollage(input_file)