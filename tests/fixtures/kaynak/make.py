import json, sys, numpy as np, onnx
from onnx import helper as H, TensorProto as TP, numpy_helper as NH
out = sys.argv[1]
D, HOP, STEPS = 4, 1920, 2
vocab = ["<pad>", "<unk>", " ", ".", ",", "'", "!", "?", "-", ":", ";"] + list("abcçdefgğhıijklmnoöprsştuüvyzqwx")
json.dump({"vocab": vocab, "times": [0.0, 0.5], "latent_dim": D, "hop": HOP}, open(out + "/meta.json", "w"))

def save(g, name):
    m = H.make_model(g, opset_imports=[H.make_opsetid("", 17)], ir_version=8)
    onnx.checker.check_model(m)
    onnx.save(m, out + "/" + name)

# text: ids [1,L] -> h [1,L,1], dur [1,L] (1,5 kare/harf)
g = H.make_graph([
    H.make_node("Cast", ["ids"], ["f"], to=TP.FLOAT),
    H.make_node("Unsqueeze", ["f", "ax2"], ["h"]),
    H.make_node("Mul", ["f", "zero"], ["z0"]),
    H.make_node("Add", ["z0", "dpc"], ["dur"]),
], "text", [H.make_tensor_value_info("ids", TP.INT64, [1, "L"])],
   [H.make_tensor_value_info("h", TP.FLOAT, [1, "L", 1]), H.make_tensor_value_info("dur", TP.FLOAT, [1, "L"])],
   [NH.from_array(np.array([2], np.int64), "ax2"), NH.from_array(np.array(0, np.float32), "zero"), NH.from_array(np.array(1.5, np.float32), "dpc")])
save(g, "text.onnx")

# sound: (h, cg, fg, cw, fw, noise[1,S,T,D]) -> latents [1,T,D]
g = H.make_graph([
    H.make_node("ReduceMean", ["noise"], ["m"], axes=[1], keepdims=0),
    H.make_node("Mul", ["m", "zero"], ["m0"]),
    H.make_node("Unsqueeze", ["fg", "ax2"], ["fg3"]),
    H.make_node("Add", ["m0", "fg3"], ["latents"]),
], "sound", [
    H.make_tensor_value_info("h", TP.FLOAT, [1, "L", 1]), H.make_tensor_value_info("cg", TP.FLOAT, [1, "L"]),
    H.make_tensor_value_info("fg", TP.FLOAT, [1, "T"]), H.make_tensor_value_info("cw", TP.INT64, [1, "L"]),
    H.make_tensor_value_info("fw", TP.INT64, [1, "T"]), H.make_tensor_value_info("noise", TP.FLOAT, [1, STEPS, "T", D])],
   [H.make_tensor_value_info("latents", TP.FLOAT, [1, "T", D])],
   [NH.from_array(np.array([2], np.int64), "ax2"), NH.from_array(np.array(0, np.float32), "zero")])
save(g, "sound.onnx")

# decoder: z [1,D,n] -> audio [1,n*HOP] (450 Hz, genlik 0,1)
tone = (0.1 * np.sin(2 * np.pi * 450 * np.arange(HOP) / 48000)).astype(np.float32).reshape(1, 1, HOP)
g = H.make_graph([
    H.make_node("Slice", ["z", "s0", "s1", "ax1"], ["zc"]),
    H.make_node("Transpose", ["zc"], ["zt"], perm=[0, 2, 1]),
    H.make_node("Mul", ["zt", "zero"], ["z0"]),
    H.make_node("Add", ["z0", "one"], ["z1"]),
    H.make_node("Mul", ["z1", "tone"], ["w"]),
    H.make_node("Reshape", ["w", "flat"], ["audio"]),
], "decoder", [H.make_tensor_value_info("z", TP.FLOAT, [1, D, "n"])],
   [H.make_tensor_value_info("audio", TP.FLOAT, [1, "N"])],
   [NH.from_array(np.array([0], np.int64), "s0"), NH.from_array(np.array([1], np.int64), "s1"), NH.from_array(np.array([1], np.int64), "ax1"),
    NH.from_array(np.array(0, np.float32), "zero"), NH.from_array(np.array(1, np.float32), "one"), NH.from_array(tone, "tone"),
    NH.from_array(np.array([1, -1], np.int64), "flat")])
save(g, "decoder.onnx")
print("ok")
